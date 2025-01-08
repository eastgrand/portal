'use client';

import React, { useState } from 'react';
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
import { Users, ExternalLink, FolderOpen } from "lucide-react";

interface Project {
  id: string;
  name: string;
  created_at: string;
}

interface ProjectsListProps {
  projects: Project[];
}

const ProjectsList: React.FC<ProjectsListProps> = ({ projects }) => {
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
                    <Button 
                      variant="default"
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => console.log('Open project:', project.id)}
                    >
                      <FolderOpen className="h-4 w-4 mr-1" />
                      Open
                    </Button>
                    <Button 
                      variant="default"
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => console.log('View members:', project.id)}
                    >
                      <Users className="h-4 w-4 mr-1" />
                      Members
                    </Button>
                    <Button 
                      variant="default"
                      size="sm"
                      className="bg-orange-500 hover:bg-orange-600"
                      onClick={() => console.log('Get embed code:', project.id)}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Embed
                    </Button>
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