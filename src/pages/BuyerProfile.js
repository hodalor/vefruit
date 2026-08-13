import BuyerPortalLayout from '../components/BuyerPortalLayout';
import { useUserAuth } from '../auth/UserAuthContext';

function BuyerProfile() {
  const { current } = useUserAuth();

  const rows = [
    ['Full Name', current?.name || 'Not available'],
    ['Username', current?.username || 'Not available'],
    ['Email', current?.email || 'Not available'],
    ['Phone', current?.phone || 'Not available'],
    ['Address', current?.address || 'Not available'],
    ['ID Type', current?.idType || 'Not available'],
    ['ID Number', current?.idNumber || 'Not available'],
    ['Role', current?.role || 'buyer'],
  ];

  return (
    <BuyerPortalLayout
      title="Profile"
      subtitle="Your account details and identity information."
      sidebarNote="Profile details for the signed-in buyer"
    >
      <div className="BuyerProfileGrid">
        {rows.map(([label, value]) => (
          <div className="Card" key={label}>
            <div className="CardBody">
              <div className="Muted">{label}</div>
              <strong>{value}</strong>
            </div>
          </div>
        ))}
      </div>
    </BuyerPortalLayout>
  );
}

export default BuyerProfile;
