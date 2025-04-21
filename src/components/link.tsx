import { ComponentChildren } from 'preact';
import { router } from '../utils/use-router';

type LinkProps = {
  to: string;
  children: ComponentChildren;
  className?: string;
  activeClassName?: string;
  onClick?: (e: MouseEvent) => void;
};

export function Link({ to, children, className = '', activeClassName = '', onClick }: LinkProps) {
  const isActive = window.location.hash.slice(1) === to || 
                  (to !== '/' && window.location.hash.startsWith('#' + to));
  
  const handleClick = (e: MouseEvent) => {
    e.preventDefault();
    
    if (onClick) {
      onClick(e);
    }
    
    router.navigate(to);
  };
  
  const combinedClassName = `${className} ${isActive ? activeClassName : ''}`.trim();
  
  return (
    <a 
      href={`#${to}`} 
      onClick={handleClick}
      className={combinedClassName || undefined}
    >
      {children}
    </a>
  );
} 