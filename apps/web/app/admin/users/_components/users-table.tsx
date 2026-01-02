'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { ColumnDef } from '@tanstack/react-table';
import { Search } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Badge } from '@kit/ui/badge';
import { Button } from '@kit/ui/button';
import { DataTable } from '@kit/ui/enhanced-data-table';
import { Form, FormControl, FormField, FormItem } from '@kit/ui/form';
import { Input } from '@kit/ui/input';
import { Spinner } from '@kit/ui/spinner';

import { SuperAdminToggle } from './super-admin-toggle';

interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  isSuperAdmin: boolean;
  isSuperAdminByMetadata: boolean;
}

interface UsersApiResponse {
  users: User[];
  page: number;
  pageSize: number;
  total: number;
}

const SearchSchema = z.object({
  query: z.string().optional(),
});

export function UsersTable() {
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [pageCount, setPageCount] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const query = searchParams.get('query') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);

  const form = useForm({
    resolver: zodResolver(SearchSchema),
    defaultValues: {
      query: query,
    },
  });

  useEffect(() => {
    const fetchUsers = async () => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          pageSize: pageSize.toString(),
        });
        if (query) {
          params.set('query', query);
        }

        const response = await fetch(`/api/admin/users?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Failed to fetch users');
        }

        const data: UsersApiResponse = await response.json();
        setUsers(data.users);
        setPageCount(Math.ceil(data.total / pageSize));
        setCurrentPage(data.page);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [page, query]);

  const onSearch = ({ query: searchQuery }: z.infer<typeof SearchSchema>) => {
    const params = new URLSearchParams();
    if (searchQuery) {
      params.set('query', searchQuery);
    }
    params.set('page', '1');
    router.push(`${pathname}?${params.toString()}`);
  };

  const columns: ColumnDef<User>[] = [
    {
      id: 'email',
      header: 'Email',
      accessorKey: 'email',
      cell: ({ row }) => (
        <div className="font-medium">{row.original.email}</div>
      ),
    },
    {
      id: 'name',
      header: 'Name',
      accessorKey: 'name',
      cell: ({ row }) => row.original.name || '-',
    },
    {
      id: 'superAdmin',
      header: 'Super Admin',
      cell: ({ row }) => {
        const user = row.original;
        // Show badge if user has super admin via app_metadata (legacy method)
        if (user.isSuperAdminByMetadata && !user.isSuperAdmin) {
          return (
            <div className="flex items-center gap-2">
              <SuperAdminToggle
                userId={user.id}
                initialValue={user.isSuperAdmin}
              />
              <Badge variant="secondary" className="text-xs">
                Via app_metadata
              </Badge>
            </div>
          );
        }
        return (
          <SuperAdminToggle userId={user.id} initialValue={user.isSuperAdmin} />
        );
      },
    },
    {
      id: 'createdAt',
      header: 'Created At',
      accessorKey: 'createdAt',
      cell: ({ row }) => {
        const date = new Date(row.original.createdAt);
        return date.toLocaleDateString();
      },
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex justify-end">
        <Form {...form}>
          <form
            className="flex gap-2.5"
            onSubmit={form.handleSubmit(onSearch)}
          >
            <FormField
              name="query"
              render={({ field }) => (
                <FormItem>
                  <FormControl className="w-full min-w-36 md:min-w-80">
                    <Input
                      className="w-full"
                      placeholder="Search by email or name..."
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <Button type="submit" size="default">
              <Search className="mr-2 h-4 w-4" />
              Search
            </Button>
          </form>
        </Form>
      </div>

      <DataTable
        pageSize={pageSize}
        pageIndex={currentPage - 1}
        pageCount={pageCount}
        data={users}
        columns={columns}
      />
    </div>
  );
}
