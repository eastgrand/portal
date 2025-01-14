'use client';

import React from 'react';
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
import { Trash2 } from "lucide-react";
import { Button } from "@kit/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@kit/ui/tooltip";
import { useToast } from "@kit/ui/use-toast";

type UserRole = 'owner' | 'admin' | 'member' | 'super_admin';

interface Member {
  user_id: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
  name: string;
  email: string;
  avatar_url?: string;
}

interface MembersDialogProps {
  projectId: string;
  currentUserRole: UserRole;
  members: Member[];
  children: React.ReactNode;
  onDeleteMember: (memberId: string) => Promise<void>;
}

const MembersDialog: React.FC<MembersDialogProps> = ({ 
  currentUserRole,
  members,
  children,
  onDeleteMember
}) => {
  const { toast } = useToast();

  const canDeleteMember = (memberRole: UserRole): boolean => {
    if (currentUserRole === 'super_admin') return true;
    if (currentUserRole === 'owner' && memberRole !== 'super_admin') return true;
    return false;
  };

  const handleDelete = async (memberId: string): Promise<void> => {
    try {
      await onDeleteMember(memberId);
      toast({
        title: "Member removed",
        description: "The member has been removed from the project.",
      });
    } catch {
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
                  void handleDelete(member.user_id);
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
                <TableRow key={member.user_id}>
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MembersDialog;