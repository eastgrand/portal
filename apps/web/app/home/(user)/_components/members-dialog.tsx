/* eslint-disable @typescript-eslint/no-unused-vars */
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

const MembersDialog: React.FC<MembersDialogProps> = ({ 
  projectId, 
  currentUserRole,
  children 
}) => {
  // This would normally come from an API call
  const members: Member[] = [
    { 
      id: '1', 
      name: 'John Doe', 
      email: 'john@example.com', 
      avatar_url: 'https://example.com/avatar1.jpg',
      role: 'owner'
    },
    { 
      id: '2', 
      name: 'Jane Smith', 
      email: 'jane@example.com', 
      avatar_url: 'https://example.com/avatar2.jpg',
      role: 'member'
    },
  ];

  const canDeleteMember = (memberRole: UserRole) => {
    // Super admin can delete anyone
    if (currentUserRole === 'super_admin') return true;
    
    // Owner can delete anyone except super_admin
    if (currentUserRole === 'owner' && memberRole !== 'super_admin') return true;
    
    return false;
  };

  const handleDelete = (memberId: string) => {
    console.log('Delete member:', memberId);
    // Implementation for member deletion would go here
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase();
  };

  const renderDeleteButton = (member: Member) => {
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
              onClick={() => isDeleteEnabled && handleDelete(member.id)}
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
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MembersDialog;