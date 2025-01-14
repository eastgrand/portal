/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@kit/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@kit/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@kit/ui/avatar";
import { Trash2, Loader2 } from "lucide-react";
import { Button } from "@kit/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@kit/ui/tooltip";
import { useToast } from "@kit/ui/use-toast";

type UserRole = 'owner' | 'admin' | 'member' | 'super_admin';

interface Member {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  role: UserRole;
}

interface MembersDialogProps {
  projectId: string;
  currentUserRole: UserRole;
  children: React.ReactNode;
}

interface UseMembersListResult {
  members: Member[];
  isLoading: boolean;
  error: string | null;
  deleteMember: (memberId: string) => Promise<boolean>;
}

const useMembersList = (projectId: string): UseMembersListResult => {
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`/api/projects/${projectId}/members`);
        
        if (!response.ok) {
          throw new Error('Failed to fetch members');
        }

        const data = await response.json();
        setMembers(data);
        setError(null);
      } catch (error) {
        setError(error instanceof Error ? error.message : 'Failed to load members');
      } finally {
        setIsLoading(false);
      }
    };

    void fetchMembers();
  }, [projectId]);

  const deleteMember = async (memberId: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/projects/${projectId}/members/${memberId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete member');
      }

      setMembers(prevMembers => prevMembers.filter(member => member.id !== memberId));
      return true;
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : 'Failed to delete member');
    }
  };

  return { members, isLoading, error, deleteMember };
};

const MembersDialog: React.FC<MembersDialogProps> = ({ 
  projectId, 
  currentUserRole,
  children 
}) => {
  const { toast } = useToast();
  const { members, isLoading, error, deleteMember } = useMembersList(projectId);

  const canDeleteMember = (memberRole: UserRole): boolean => {
    if (currentUserRole === 'super_admin') return true;
    if (currentUserRole === 'owner' && memberRole !== 'super_admin') return true;
    return false;
  };

  const handleDelete = async (memberId: string): Promise<void> => {
    try {
      await deleteMember(memberId);
      toast({
        title: "Member removed",
        description: "The member has been removed from the project.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove member. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  const renderDeleteButton = (member: Member): JSX.Element => {
    const isDeleteEnabled = canDeleteMember(member.role);
    
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <span>
            <Button
              variant="ghost"
              size="icon"
              className={`h-8 w-8 ${
                isDeleteEnabled 
                  ? 'text-red-500 hover:text-red-700 hover:bg-red-100' 
                  : 'text-gray-300 cursor-not-allowed'
              }`}
              onClick={() => {
                if (isDeleteEnabled) {
                  void handleDelete(member.id);
                }
              }}
              disabled={!isDeleteEnabled}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </span>
        </TooltipTrigger>
        <TooltipContent>
          {!isDeleteEnabled 
            ? "Only project owners and super admins can remove members"
            : "Remove member"}
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="min-w-[600px]">
        <DialogHeader>
          <DialogTitle>Project Members</DialogTitle>
        </DialogHeader>
        
        <div className="mt-4">
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
            </div>
          ) : error ? (
            <div className="text-center text-red-500 py-4">
              {error}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[50px]"></TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.avatar_url} />
                        <AvatarFallback>{getInitials(member.name)}</AvatarFallback>
                      </Avatar>
                    </TableCell>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell>{member.email}</TableCell>
                    <TableCell className="capitalize">{member.role.replace('_', ' ')}</TableCell>
                    <TableCell>
                      {renderDeleteButton(member)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MembersDialog;