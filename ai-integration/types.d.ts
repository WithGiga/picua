// Type declarations for missing modules
declare module 'react' {
  export function createContext<T>(defaultValue: T): React.Context<T>;
  export function useContext<T>(context: React.Context<T>): T;
  export function useState<S>(initialState: S | (() => S)): [S, (value: S | ((prev: S) => S)) => void];
  export function useRef<T>(initialValue: T): React.MutableRefObject<T>;
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: any[]): T;
  
  export interface MutableRefObject<T> {
    current: T;
  }
  
  export namespace React {
    export interface Context<T> {
      Provider: React.Provider<T>;
      Consumer: React.Consumer<T>;
    }
    
    export interface Provider<T> {
      (props: { value: T; children: ReactNode }): JSX.Element;
    }
    
    export interface Consumer<T> {
      (props: { children: (value: T) => ReactNode }): JSX.Element;
    }
    
    export type ReactNode = any;
    export type FormEvent = any;
  }
}

declare global {
  namespace JSX {
    interface Element {}
  }
}

declare module '@anthropic-ai/sdk' {
  export * from '@anthropic-ai/sdk';
}

declare module '@anthropic-ai/sdk/resources/beta/messages/messages.mjs' {
  export * from '@anthropic-ai/sdk/resources/beta/messages/messages.mjs';
}

// Make sure our local modules are recognized
declare module './api' {
  export * from './api';
}

declare module './chat' {
  export * from './chat';
}

declare module './logger' {
  export * from './logger';
}
