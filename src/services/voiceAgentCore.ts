// VoiceAgentCore - Transport-agnostic orchestrator for the FarmDirect Voice Agent.
//
// This module provides a clean API that can be used by any transport layer:
// - Browser Voice (VoiceAssistant.tsx)
// - Phone Call (future: Twilio/Vonage WebSocket)
// - Text Chat (future: messaging integration)
//
// It delegates to conversationManager for state management and listingParser for NLP,
// keeping this layer free of UI code, browser APIs, or transport-specific logic.

import {
  sendConversationTurn,
  resetConversation,
  generateSessionId,
  buildFinalListing,
  submitListing as submitListingApi,
  getSession as getConversationSession,
} from './conversationManager';
import type {
  ConversationTurnResult,
  ConversationState,
  ListingData,
  FinalListing,
  ConversationSession,
} from './conversationManager';

// ===== Types =====

export interface VoiceAgentSession {
  id: string;
  state: ConversationState;
  listing: ListingData;
  language: 'hi' | 'hinglish' | 'en' | null;
}

export interface ProcessTurnResult {
  success: boolean;
  state: ConversationState;
  listing: ListingData;
  agent_message: string;
  missing_fields: string[];
  next_field?: string;
  session_id: string;
  listing_id?: string;
  error?: string;
}

export interface SubmitListingResult {
  success: boolean;
  listing_id?: string;
  status?: string;
  error?: string;
}

export type VoiceAgentEvent =
  | { type: 'turn_processed'; result: ProcessTurnResult }
  | { type: 'listing_submitted'; result: SubmitListingResult }
  | { type: 'session_reset'; session_id: string }
  | { type: 'error'; error: string; session_id: string };

// ===== Core Class =====

export class VoiceAgentCore {
  private sessionIds: Map<string, string> = new Map();
  // Exactly-once submission guards: repeated "Haan" events, React re-renders,
  // or duplicate confirm calls must not create more than ONE listing per session.
  private submittedIds: Map<string, string> = new Map();
  private submitInFlight: Map<string, Promise<SubmitListingResult>> = new Map();

  /**
   * Create a new conversation session.
   * Returns the session ID to be used for subsequent turns.
   */
  createSession(): string {
    const sessionId = generateSessionId();
    this.sessionIds.set(sessionId, sessionId);
    return sessionId;
  }

  /**
   * Process a single conversation turn.
   *
   * This is the primary method for any transport layer to call.
   * It takes raw user text and returns the agent's response.
   *
   * @param sessionId - The session ID from createSession()
   * @param text - The raw user input (speech-to-text or typed)
   * @returns ProcessTurnResult with agent response and state
   */
  async processTurn(sessionId: string, text: string): Promise<ProcessTurnResult> {
    if (!sessionId || typeof sessionId !== 'string') {
      return {
        success: false,
        state: 'ERROR',
        listing: this.getEmptyListing(),
        agent_message: '',
        missing_fields: [],
        session_id: sessionId || '',
        error: 'session_id is required',
      };
    }

    if (!text || typeof text !== 'string' || !text.trim()) {
      return {
        success: false,
        state: 'ERROR',
        listing: this.getEmptyListing(),
        agent_message: '',
        missing_fields: [],
        session_id: sessionId,
        error: 'text is required',
      };
    }

    try {
      const result = await sendConversationTurn(sessionId, text.trim());
      return this.normalizeResult(result);
    } catch (e: any) {
      return {
        success: false,
        state: 'ERROR',
        listing: this.getEmptyListing(),
        agent_message: '',
        missing_fields: [],
        session_id: sessionId,
        error: e?.message || 'Unknown error',
      };
    }
  }

  /**
   * Handle confirmation response during CONFIRMING state.
   *
   * @param sessionId - The session ID
   * @param confirm - true for affirmative (Haan/Yes), false for negative (Nahi/No)
   * @returns ProcessTurnResult with updated state
   */
  async confirmListing(sessionId: string, confirm: boolean): Promise<ProcessTurnResult> {
    const text = confirm ? 'Haan' : 'Nahi';
    return this.processTurn(sessionId, text);
  }

  /**
   * Submit the listing to FarmDirect API.
   *
   * Call this after the conversation reaches SUCCESS state.
   *
   * @param sessionId - The session ID
   * @returns SubmitListingResult with listing_id on success
   */
  async submitToApi(sessionId: string): Promise<SubmitListingResult> {
    // Idempotent: return the preserved listing_id without re-POSTing.
    const cached = this.submittedIds.get(sessionId);
    if (cached) {
      return { success: true, listing_id: cached, status: 'created' };
    }
    const inflight = this.submitInFlight.get(sessionId);
    if (inflight) return inflight;

    const session = getConversationSession(sessionId);
    if (!session) {
      return {
        success: false,
        error: 'Session not found',
      };
    }

    // If the API was already called during processTurn/confirmListing and
    // the session carries a listing_id, register it and return immediately.
    if (session.listing_id) {
      this.submittedIds.set(sessionId, session.listing_id);
      return { success: true, listing_id: session.listing_id, status: 'created' };
    }

    if (session.state !== 'SUCCESS') {
      return {
        success: false,
        error: 'Listing not ready for submission',
      };
    }

    const pending = (async (): Promise<SubmitListingResult> => {
      try {
        const finalListing = buildFinalListing(session.listing);
        const result = await submitListingApi(finalListing);
        if (result.success && result.listing_id) {
          // Preserve listing_id for duplicate callers / re-renders.
          this.submittedIds.set(sessionId, result.listing_id);
        }
        return {
          success: result.success,
          listing_id: result.listing_id,
          status: result.status,
          error: result.error,
        };
      } catch (e: any) {
        return {
          success: false,
          error: e?.message || 'Submission failed',
        };
      } finally {
        this.submitInFlight.delete(sessionId);
      }
    })();
    this.submitInFlight.set(sessionId, pending);
    return pending;
  }

  /**
   * Reset a session and clear all associated data.
   */
  resetSession(sessionId: string): void {
    resetConversation(sessionId);
    this.sessionIds.delete(sessionId);
    this.submittedIds.delete(sessionId);
    this.submitInFlight.delete(sessionId);
  }

  /**
   * Get the current session state (for UI rendering or debugging).
   */
  getSession(sessionId: string): VoiceAgentSession | null {
    const session = getConversationSession(sessionId);
    if (!session) {
      return null;
    }
    return {
      id: session.id,
      state: session.state,
      listing: session.listing,
      language: session.language,
    };
  }

  /**
   * Build the final listing object from session data.
   * Use this to get the listing JSON before submission.
   */
  getFinalListing(sessionId: string): FinalListing | null {
    const session = getConversationSession(sessionId);
    if (!session) {
      return null;
    }
    return buildFinalListing(session.listing);
  }

  // ===== Private Helpers =====

  private getEmptyListing(): ListingData {
    return {
      farmer_name: null,
      phone: null,
      product: null,
      quantity: null,
      unit: null,
      asking_price: null,
      price_unit: null,
      location: null,
      quality: null,
      intent: 'sell',
      source: 'voice_agent',
    };
  }

  private normalizeResult(result: ConversationTurnResult): ProcessTurnResult {
    return {
      success: result.success,
      state: result.state,
      listing: result.listing,
      agent_message: result.agent_message,
      missing_fields: result.missing_fields,
      next_field: result.next_field,
      session_id: result.session_id,
      listing_id: result.listing_id,
      error: result.error,
    };
  }
}

// ===== Factory Function =====

/**
 * Create a new VoiceAgentCore instance.
 *
 * Usage:
 * ```typescript
 * const core = createVoiceAgent();
 * const sessionId = core.createSession();
 * const result = await core.processTurn(sessionId, "10 kilo wheat hai");
 * // result.agent_message = "..."
 * // result.state = "ASKING"
 * ```
 */
export const createVoiceAgent = (): VoiceAgentCore => {
  return new VoiceAgentCore();
};

// ===== Re-exports for convenience =====

export {
  buildFinalListing,
  submitListingApi as submitListing,
};
export type { FinalListing, ListingData };
