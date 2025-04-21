import { useState } from "preact/hooks";
import { useRouter } from "../utils/use-router";

type ShareButtonProps = {
  projectId: string | number;
  className?: string;
};

export function ShareButton({ projectId, className = "" }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const { getProjectShareLink } = useRouter();

  const handleShare = () => {
    const link = getProjectShareLink(projectId);

    // Try to use the Clipboard API to copy the link
    navigator.clipboard
      .writeText(link)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((err) => {
        console.error("Failed to copy: ", err);
        // Fallback - create a temporary input and copy from it
        const input = document.createElement("input");
        input.value = link;
        document.body.appendChild(input);
        input.select();
        document.execCommand("copy");
        document.body.removeChild(input);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
  };

  return (
    <button
      onClick={handleShare}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md 
      ${
        copied
          ? "bg-success text-success-fg"
          : "bg-primary text-primary-fg hover:opacity-90"
      } 
      transition-colors ${className}`}
    >
      {copied ? (
        <>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fill-rule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clip-rule="evenodd"
            />
          </svg>
          Copied!
        </>
      ) : (
        <>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" />
          </svg>
          Share Link
        </>
      )}
    </button>
  );
}
