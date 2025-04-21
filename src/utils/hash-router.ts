// A lightweight hash-based router for handling direct links to projects
// Example: /#/app/123 - where 123 is the projectId

type Route = {
  path: string;
  pattern: RegExp;
  params: string[];
};

export type RouteMatch = {
  path: string;
  params: Record<string, string>;
};

export class HashRouter {
  private routes: Route[] = [];
  private currentRoute: RouteMatch | null = null;
  private listeners: ((route: RouteMatch | null) => void)[] = [];

  constructor() {
    // Initialize and listen for hash changes
    window.addEventListener('hashchange', this.handleHashChange.bind(this));
    // Handle initial route
    setTimeout(() => this.handleHashChange(), 0);
  }

  // Add a new route pattern
  // Example: router.addRoute('/app/:projectId')
  addRoute(path: string): void {
    const params: string[] = [];
    const pattern = new RegExp(
      `^${path.replace(/:(\w+)/g, (_, paramName) => {
        params.push(paramName);
        return '([^/]+)';
      })}$`
    );

    this.routes.push({ path, pattern, params });
  }

  // Navigate to a specific path
  navigate(path: string): void {
    window.location.hash = path.startsWith('/') ? path : `/${path}`;
  }

  // Subscribe to route changes
  subscribe(listener: (route: RouteMatch | null) => void): () => void {
    this.listeners.push(listener);
    // Call listener with current route immediately
    listener(this.currentRoute);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  // Handle hash change events
  private handleHashChange(): void {
    const hash = window.location.hash.slice(1) || '/';
    let match: RouteMatch | null = null;

    for (const route of this.routes) {
      const result = route.pattern.exec(hash);
      if (result) {
        const params: Record<string, string> = {};
        route.params.forEach((param, index) => {
          params[param] = result[index + 1];
        });
        match = { path: route.path, params };
        break;
      }
    }

    this.currentRoute = match;
    this.notifyListeners();
  }

  // Get the current route match
  getCurrentRoute(): RouteMatch | null {
    return this.currentRoute;
  }

  // Notify all subscribers of route changes
  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.currentRoute);
    }
  }
} 