import { Link } from './link';
import { useRouter } from '../utils/use-router';
import { launchParams } from '../app';

export function Header() {
  const { projectId } = useRouter();
  
  // Get user info from Telegram launch params
  const user = launchParams?.tgWebAppData?.user;
  const userDisplayName = user ? (user.first_name + (user.last_name ? ` ${user.last_name}` : '')) : 'User';
  const userId = user?.id;
  
  return (
    <header className="bg-navbar text-navbar-fg p-4 flex justify-between items-center shadow-sm mb-4">
      <div className="flex items-center gap-2">
        <Link to="/" className="text-lg font-semibold hover:underline">
          Timeslot Client
        </Link>
        
        {projectId && (
          <>
            <span className="mx-2 text-muted-fg">/</span>
            <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-md">
              Project {projectId}
            </span>
          </>
        )}
      </div>
      
      <div className="flex items-center gap-4">
        <nav className="flex items-center gap-4">
          <Link 
            to="/" 
            className="text-sm hover:underline"
            activeClassName="font-semibold"
          >
            Home
          </Link>
          
          {projectId ? (
            <Link 
              to={`/app/${projectId}`} 
              className="text-sm hover:underline"
              activeClassName="font-semibold"
            >
              Current Project
            </Link>
          ) : (
            <Link 
              to="/app/1" 
              className="text-sm hover:underline"
              activeClassName="font-semibold"
            >
              Demo Project
            </Link>
          )}
        </nav>
        
        {user && (
          <div className="flex items-center gap-2 ml-4 px-3 py-1 bg-secondary/50 rounded-full">
            {user.photo_url && (
              <img 
                src={user.photo_url} 
                alt={userDisplayName}
                className="w-6 h-6 rounded-full" 
              />
            )}
            <span className="text-sm font-medium">{userDisplayName}</span>
            <span className="text-xs text-muted-fg">#{userId}</span>
          </div>
        )}
      </div>
    </header>
  );
} 