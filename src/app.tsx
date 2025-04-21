import "./app.css";
import { useRouter } from "./utils/use-router";
import { LaunchParams, useLaunchParams } from "@telegram-apps/sdk-react";
import { Home } from "./pages/index";
import { ProjectView } from "./pages/project-view";

export let launchParams: LaunchParams | null = null;

export function App() {
  const { currentPath, projectId, navigateToProject } = useRouter();
  try {
    launchParams = useLaunchParams();
  } catch (error) {
    console.error("Error getting launch params, using default values");
    launchParams = {
      tgWebAppPlatform: "unknown",
      tgWebAppThemeParams: {},
      tgWebAppVersion: "unknown",
      tgWebAppData: {
        auth_date: new Date(),
        hash: "hash",
        signature: "signature",
        user: {
          id: 379699020,
          first_name: "John",
          last_name: "Doe",
          username: "john_doe",
          photo_url: "https://example.com/photo.jpg",
        },
      },
    };
  }

  // Simple hash-based routing
  const renderContent = () => {
    // If we have a project ID in the route, render the project view
    if (currentPath === "/app/:projectId" && projectId) {
      return (
        <ProjectView
          projectId={projectId}
          telegramUserId={launchParams?.tgWebAppData?.user?.id || 0}
        />
      );
    }

    // Otherwise render the home view
    return (
      <Home
        onNavigateToProject={navigateToProject}
        telegramUserId={launchParams?.tgWebAppData?.user?.id || 0}
      />
    );
  };

  return <div className="app-container">{renderContent()}</div>;
}
