import { AdminDashboard } from '@kit/admin/components/admin-dashboard';
import { AdminGuard } from '@kit/admin/components/admin-guard';
import { PageBody, PageHeader } from '@kit/ui/page';

function AdminPage() {
  return (
    <>
      <PageHeader
        title={'Super Admin'}
        description={``}
      />

      <PageBody>
        <AdminDashboard />
      </PageBody>
    </>
  );
}

export default AdminGuard(AdminPage);
