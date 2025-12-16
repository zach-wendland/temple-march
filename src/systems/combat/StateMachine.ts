/**
 * Generic State Machine implementation for combat states and AI behavior.
 * Supports conditional transitions, automatic transitions, and state history.
 */

/**
 * Interface for a state in the state machine.
 */
export interface State<TContext = unknown> {
  /** Unique state name */
  readonly name: string;
  /** Called when entering this state */
  onEnter?(context?: TContext): void;
  /** Called when exiting this state */
  onExit?(context?: TContext): void;
  /** Called each update while in this state */
  onUpdate?(deltaMs: number, context?: TContext): void;
}

/**
 * Transition definition between states.
 */
export interface Transition<TContext = unknown> {
  /** Source state name */
  from: string;
  /** Target state name */
  to: string;
  /** Condition function that must return true for transition to occur */
  condition: (context?: TContext) => boolean;
  /** If true, transition is checked automatically each update */
  automatic?: boolean;
  /** Priority for multiple valid transitions (higher = checked first) */
  priority?: number;
}

/**
 * Generic State Machine.
 *
 * Features:
 * - State registration and management
 * - Conditional transitions
 * - Automatic transitions (checked each update)
 * - State lifecycle callbacks (enter, exit, update)
 * - State history tracking
 * - Time in state tracking
 */
export class StateMachine<TContext = unknown> {
  private states: Map<string, State<TContext>> = new Map();
  private transitions: Map<string, Transition<TContext>[]> = new Map();
  private _currentState: State<TContext> | null = null;
  private _previousState: State<TContext> | null = null;
  private _timeInCurrentState: number = 0;
  private history: State<TContext>[] = [];
  private maxHistorySize: number;
  private context?: TContext;

  constructor(maxHistorySize: number = 10) {
    this.maxHistorySize = maxHistorySize;
  }

  /**
   * Gets the current state.
   */
  get currentState(): State<TContext> | null {
    return this._currentState;
  }

  /**
   * Gets the previous state.
   */
  get previousState(): State<TContext> | null {
    return this._previousState;
  }

  /**
   * Gets time spent in current state (ms).
   */
  get timeInCurrentState(): number {
    return this._timeInCurrentState;
  }

  /**
   * Adds a state to the machine.
   * @param state - The state to add
   * @throws Error if state name already exists
   */
  addState(state: State<TContext>): this {
    if (this.states.has(state.name)) {
      throw new Error(`State '${state.name}' already exists`);
    }
    this.states.set(state.name, state);
    return this;
  }

  /**
   * Removes a state from the machine.
   * @param name - State name to remove
   */
  removeState(name: string): boolean {
    this.transitions.delete(name);
    return this.states.delete(name);
  }

  /**
   * Checks if a state exists.
   * @param name - State name to check
   */
  hasState(name: string): boolean {
    return this.states.has(name);
  }

  /**
   * Gets a state by name.
   * @param name - State name
   */
  getState(name: string): State<TContext> | undefined {
    return this.states.get(name);
  }

  /**
   * Adds a transition between states.
   * @param transition - Transition definition
   */
  addTransition(transition: Transition<TContext>): this {
    const existing = this.transitions.get(transition.from) ?? [];
    existing.push(transition);
    // Sort by priority (descending)
    existing.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
    this.transitions.set(transition.from, existing);
    return this;
  }

  /**
   * Starts the state machine with an initial state.
   * @param stateName - Initial state name
   * @param context - Optional context passed to state callbacks
   */
  start(stateName: string, context?: TContext): void {
    const state = this.states.get(stateName);
    if (!state) {
      throw new Error(`State '${stateName}' not found`);
    }

    this.context = context;
    this._currentState = state;
    this._timeInCurrentState = 0;
    this.addToHistory(state);

    if (state.onEnter) {
      state.onEnter(context);
    }
  }

  /**
   * Stops the state machine.
   */
  stop(): void {
    if (this._currentState?.onExit) {
      this._currentState.onExit(this.context);
    }
    this._currentState = null;
    this._previousState = null;
    this._timeInCurrentState = 0;
  }

  /**
   * Updates the state machine.
   * @param deltaMs - Time since last update in milliseconds
   */
  update(deltaMs: number): void {
    if (!this._currentState) {
      return;
    }

    this._timeInCurrentState += deltaMs;

    // Check automatic transitions
    this.checkAutomaticTransitions();

    // Update current state
    if (this._currentState?.onUpdate) {
      this._currentState.onUpdate(deltaMs, this.context);
    }
  }

  /**
   * Attempts to transition to a target state.
   * @param targetState - Target state name
   * @returns True if transition succeeded
   */
  transitionTo(targetState: string): boolean {
    if (!this._currentState) {
      return false;
    }

    if (!this.canTransitionTo(targetState)) {
      return false;
    }

    const nextState = this.states.get(targetState);
    if (!nextState) {
      return false;
    }

    // Exit current state
    if (this._currentState.onExit) {
      this._currentState.onExit(this.context);
    }

    // Update state references
    this._previousState = this._currentState;
    this._currentState = nextState;
    this._timeInCurrentState = 0;
    this.addToHistory(nextState);

    // Enter new state
    if (nextState.onEnter) {
      nextState.onEnter(this.context);
    }

    return true;
  }

  /**
   * Checks if a transition to target state is valid and allowed.
   * @param targetState - Target state name
   */
  canTransitionTo(targetState: string): boolean {
    if (!this._currentState) {
      return false;
    }

    const transitions = this.transitions.get(this._currentState.name) ?? [];
    const transition = transitions.find((t) => t.to === targetState);

    if (!transition) {
      return false;
    }

    return transition.condition(this.context);
  }

  /**
   * Gets available transitions from current state.
   */
  getAvailableTransitions(): string[] {
    if (!this._currentState) {
      return [];
    }

    const transitions = this.transitions.get(this._currentState.name) ?? [];
    return transitions
      .filter((t) => t.condition(this.context))
      .map((t) => t.to);
  }

  /**
   * Gets state history.
   */
  getHistory(): State<TContext>[] {
    return [...this.history];
  }

  /**
   * Clears state history.
   */
  clearHistory(): void {
    this.history = [];
  }

  /**
   * Sets the context object.
   * @param context - New context
   */
  setContext(context: TContext): void {
    this.context = context;
  }

  /**
   * Checks and executes automatic transitions.
   */
  private checkAutomaticTransitions(): void {
    if (!this._currentState) {
      return;
    }

    const transitions = this.transitions.get(this._currentState.name) ?? [];
    const automaticTransitions = transitions.filter((t) => t.automatic);

    for (const transition of automaticTransitions) {
      if (transition.condition(this.context)) {
        this.transitionTo(transition.to);
        break;
      }
    }
  }

  /**
   * Adds a state to history, respecting max size.
   */
  private addToHistory(state: State<TContext>): void {
    this.history.push(state);
    while (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }
  }
}
