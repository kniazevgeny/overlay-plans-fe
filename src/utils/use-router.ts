import { useEffect, useState } from 'preact/hooks';
import { HashRouter, RouteMatch } from './hash-router';
import { launchParams } from '../app';

// Create a singleton router instance
const router = new HashRouter();

// Define common routes
router.addRoute('/');
router.addRoute('/app/:projectId');

// Hook to use the router in components
export function useRouter() {
  const [route, setRoute] = useState<RouteMatch | null>(router.getCurrentRoute());
  
  useEffect(() => {
    // Subscribe to route changes
    return router.subscribe(setRoute);
  }, []);
  
  // Get the Telegram user ID from launch params
  const telegramUserId = launchParams?.tgWebAppData?.user?.id;
  
  return {
    route,
    currentPath: route?.path || '/',
    params: route?.params || {},
    navigate: router.navigate.bind(router),
    
    // Helper to get the current projectId (if any)
    projectId: route?.params?.projectId || null,
    
    // Helper to get Telegram user ID
    telegramUserId,
    
    // Helper to navigate to a specific project
    navigateToProject(projectId: string | number) {
      router.navigate(`/app/${projectId}`);
    },
    
    // Helper to navigate to home
    navigateToHome() {
      router.navigate('/');
    },
    
    // Helper to create a shareable link to a project
    getProjectShareLink(projectId: string | number) {
      const baseUrl = window.location.origin + window.location.pathname;
      return `${baseUrl}#/app/${projectId}`;
    }
  };
}

// Export the router instance for direct use if needed
export { router }; 