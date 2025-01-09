import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@kit/ui/dialog';
import { Button } from '@kit/ui/button';
import { Check, Copy } from 'lucide-react';

interface EmbedProjectDialogProps {
  children: React.ReactNode;
  appUrl: string;
}

export function EmbedProjectDialog({ children, appUrl }: EmbedProjectDialogProps) {
  const [copied, setCopied] = useState(false);
  
  // Generate the iframe code
  const iframeCode = `<iframe
  src="${appUrl}"
  width="100%"
  height="600"
  frameborder="0"
  allow="accelerometer; camera; encrypted-media; geolocation; microphone"
></iframe>`;

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(iframeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Embed Project</DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          <div className="relative">
            <pre className="bg-slate-950 text-slate-50 p-4 rounded-lg overflow-x-auto">
              <code>{iframeCode}</code>
            </pre>
          </div>
          
          <div className="mt-4 flex justify-end">
            <Button
              onClick={handleCopyCode}
              variant="outline"
              className="flex items-center gap-2"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Copy Code
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}