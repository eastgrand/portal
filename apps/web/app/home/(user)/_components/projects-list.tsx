'use client';

import React, { useState, ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
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
import { Users, ExternalLink, Maximize2, X, Copy, Check } from "lucide-react";
import { AccountSelector } from '@kit/accounts/account-selector';
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
  account_id: string;
  created_at: string;
  updated_at: string;
  description: string | null;
  app_url: string;
  project_members: {
    user_id: string;
    role: 'owner' | 'admin' | 'member';
  }[];
  members: {
    user_id: string;
    role: UserRole;
    created_at: string;
    updated_at: string;
    name: string;
    email: string;
    avatar_url?: string;
  }[];
}

type UserRole = 'owner' | 'admin' | 'member';

interface AccountData {
  label: string;
  value: string;
  image: string | null;
}

interface ProjectsListProps {
  projects: Project[];
  userRole: UserRole;
  user?: User;
  accounts?: AccountData[]; // Added optional accounts prop
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
            <pre className="bg-slate-950 text-slate-50 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap break-all">
              <code className="text-sm">{iframeCode}</code>
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

export default function ProjectsList({ 
  projects, 
  userRole, 
  user, 
  accounts = [] 
}: ProjectsListProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleAccountChange = (value: string | undefined) => {
    // Handle account change navigation
    if (value === undefined) {
      window.location.href = '/home/projects';
    } else {
      window.location.href = `/home/${value}/projects`;
    }
  };

  return (
    <div className="w-full space-y-4">
      {user && (
        <div className="mb-6">
          <AccountSelector
            user={user}
            userRole={userRole}
            features={{
              enableTeamCreation: true
            }}
            accounts={accounts}
            onAccountChange={handleAccountChange}
          />
        </div>
      )}

      <Input
        placeholder="Search projects..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="max-w-sm"
      />

      <div className="w-full">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[300px]">Project Name</TableHead>
              <TableHead className="w-[200px]">Created</TableHead>
              <TableHead>Actions</TableHead>
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
                      members={project.members}
                      onDeleteMember={async (userId: string) => {
                        const response = await fetch(`/api/projects/${project.id}/members/${userId}`, {
                          method: 'DELETE'
                        });
                        
                        if (!response.ok) {
                          throw new Error('Failed to delete member');
                        }
                      }}
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
}