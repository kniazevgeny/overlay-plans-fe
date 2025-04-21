import { launchParams } from "../app";
import { useRouter } from "../utils/use-router";

export const Home = (props: {
  onNavigateToProject: (projectId: string) => void;
  telegramUserId: number;
}) => {
  // Demo project links - in a real app, you would fetch projects for this user
  const demoProjects = ["1", "2", "3"];
  const { getProjectShareLink } = useRouter();

  // Get user info from Telegram launch params
  const user = launchParams?.tgWebAppData?.user;
  const userDisplayName = user
    ? user.first_name + (user.last_name ? ` ${user.last_name}` : "")
    : "User";

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="bg-card rounded-xl p-6 shadow-sm mb-6">
        <h1 className="text-2xl font-bold mb-2">Welcome, {userDisplayName}!</h1>
        <p className="text-muted-fg mb-4">
          Select one of your projects below or share a project link with others.
        </p>

        <div className="bg-muted/30 rounded-lg p-4 mb-4">
          <h2 className="text-lg font-medium mb-2">User Information</h2>
          <div className="flex items-center gap-3">
            {user?.photo_url && (
              <img
                src={user.photo_url}
                alt={userDisplayName}
                className="w-12 h-12 rounded-full"
              />
            )}
            <div>
              <p className="font-medium">{userDisplayName}</p>
              <p className="text-sm text-muted-fg">
                Telegram ID: {props.telegramUserId}
              </p>
              {user?.username && (
                <p className="text-sm text-muted-fg">@{user.username}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Your Projects</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {demoProjects.map((projectId) => (
            <div
              key={projectId}
              className="bg-background p-4 rounded-lg border border-border flex flex-col"
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-medium">Project {projectId}</h3>
                <span className="px-2 py-0.5 bg-muted text-muted-fg text-xs rounded-full">
                  Demo
                </span>
              </div>

              <p className="text-sm text-muted-fg mb-4">
                This is a sample project for demonstration purposes. In a real
                app, this would contain project details.
              </p>

              <div className="mt-auto flex gap-2">
                <button
                  className="flex-1 px-3 py-1.5 bg-primary text-primary-fg rounded-md hover:opacity-90 text-sm font-medium"
                  onClick={() => props.onNavigateToProject(projectId)}
                >
                  Open
                </button>

                <button
                  className="px-3 py-1.5 text-muted-fg hover:text-fg border border-border rounded-md text-sm"
                  onClick={() => {
                    const link = getProjectShareLink(projectId);
                    navigator.clipboard.writeText(link);
                  }}
                >
                  Copy Link
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
