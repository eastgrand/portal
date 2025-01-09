/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React, { useState, ReactNode } from 'react';
import { Button } from "@kit/ui/button";
import { Input } from "@kit/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@kit/ui/table";
import { Users, ExternalLink, Maximize2, X, Code2, Copy, Check } from "lucide-react";
import MembersDialog from './members-dialog';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose
} from "@kit/ui/dialog";

interface Project {
  id: string;
  name: string;
  created_at: string;
  app_url: string;
}

type UserRole = 'owner' | 'admin' | 'member' | 'super_admin';

interface ProjectsListProps {
  projects: Project[];
  userRole: UserRole;
}

interface ProjectIframeDialogProps {
  appUrl: string;
  children: ReactNode;
}

interface EmbedProjectDialogProps {
  appUrl: string;
  children: ReactNode;
}

const EmbedProjectDialog: React.FC<EmbedProjectDialogProps> = ({ appUrl, children }) => {
  const [copied, setCopied] = useState(false);

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
              size="sm"
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
};

const ProjectIframeDialog: React.FC<ProjectIframeDialogProps> = ({ appUrl, children }) => {
  if (!appUrl) {
    return null;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-[100vw] w-screen h-screen p-0 rounded-none">
        <div className="absolute right-4 top-4 z-50">
          <DialogClose asChild>
            <Button 
              variant="outline" 
              size="sm"
              className="bg-white hover:bg-gray-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogClose>
        </div>
        <iframe 
          src={appUrl}
          className="w-full h-full border-0"
          allow="accelerometer; camera; encrypted-media; fullscreen; geolocation; gyroscope; microphone; midi"
        />
      </DialogContent>
    </Dialog>
  );
};

const ProjectsList: React.FC<ProjectsListProps> = ({ projects, userRole }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Filter projects based on search query
  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Format date to be more readable
  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project Name</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="w-[300px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProjects.map((project) => (
              <TableRow key={project.id}>
                <TableCell className="font-medium">
                  {project.name}
                </TableCell>
                <TableCell>
                  {formatDate(project.created_at)}
                </TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <ProjectIframeDialog appUrl={project.app_url}>
                      <Button 
                        variant="default"
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Maximize2 className="h-4 w-4 mr-1" />
                        Open
                      </Button>
                    </ProjectIframeDialog>
                    <MembersDialog 
                      projectId={project.id}
                      currentUserRole={userRole}
                    >
                      <Button 
                        variant="default"
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Users className="h-4 w-4 mr-1" />
                        Members
                      </Button>
                    </MembersDialog>
                    <EmbedProjectDialog appUrl={project.app_url}>
                      <Button 
                        variant="default"
                        size="sm"
                        className="bg-orange-500 hover:bg-orange-600"
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Embed
                      </Button>
                    </EmbedProjectDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default ProjectsList;