import { AdminGuard } from '@kit/admin/components/admin-guard';
import { PageBody, PageHeader } from '@kit/ui/page';

import { UsersTable } from './_components/users-table';

export const metadata = {
  title: 'Users - Super Admin',
};

function UsersPage() {
  return (
    <>
      <PageHeader
        title="Users"
        description="Manage platform users and super admin privileges"
      />

      <PageBody>
        <UsersTable />
      </PageBody>
    </>
  );
}

export default AdminGuard(UsersPage);
