import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AlertCircle } from 'lucide-react';
import { toast } from 'sonner'; 

// Slices
import { fetchUsers, createUser, updateUser, deleteUser, clearUserErrors } from '../store/slices/userSlice';
import { fetchCustomers } from '../store/slices/customerSlice'; 
import { fetchDivisions } from '../store/slices/divisionSlice'; 

// Components
import PageHeader from '../components/PageHeader';
import UserControls from '../components/users/UserControls';
import UserTable from '../components/users/UserTable';
import UserModal from '../components/users/UserModal';

// Update initial state to match the modal's expected structure
const INITIAL_FORM_STATE = {
  name: '',
  email: '',
  phone: '',
  address: {
    street1: '',
    street2: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'US'
  },
  password: '',
  portal: 'admin',
  role: 'admin',
  customer: '',
  divisions: [],
  chargeCode: '',
  orderLimit: '' // ADDED
};

export default function AdminUsersPage() {
  const dispatch = useDispatch();
  
  const { user: currentUser } = useSelector((state) => state.auth);
  const { items: users = [], status, createStatus, error } = useSelector((state) => state.users || {});
  const { items: customers = [] } = useSelector((state) => state.customers || {});
  const { items: divisions = [] } = useSelector((state) => state.divisions || {});

  // Tab & Filter State
  const [activeTab, setActiveTab] = useState('admin'); 
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [customerFilter, setCustomerFilter] = useState('all');
  const [divisionFilter, setDivisionFilter] = useState('all');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState(null); 
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);

  // Permissions 
  const canManageUsers = ['admin', 'super_admin'].includes(currentUser?.role);
  const isSuperAdmin = currentUser?.role === 'super_admin';

  // Fetch dependencies on mount
  useEffect(() => {
    dispatch(fetchUsers());
    dispatch(fetchCustomers()); 
    dispatch(fetchDivisions()); 
  }, [dispatch]);

  // --- Filtering Logic ---
  const filteredUsers = users.filter(user => {
    const matchesPortal = user.portal === activeTab;
    const matchesSearch = user.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          user.email?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    let matchesCustomer = true;
    if (activeTab === 'order' && customerFilter !== 'all') {
      const uCustId = typeof user.customer === 'object' ? user.customer?._id : user.customer;
      matchesCustomer = uCustId === customerFilter;
    }

    let matchesDivision = true;
    if (activeTab === 'order' && divisionFilter !== 'all') {
      const userDivIds = user.divisions?.map(d => typeof d === 'object' ? d._id : d) || [];
      matchesDivision = userDivIds.includes(divisionFilter);
    }
    
    return matchesPortal && matchesSearch && matchesRole && matchesCustomer && matchesDivision;
  });

  const availableDivisionsForFilter = customerFilter === 'all' 
    ? divisions 
    : divisions.filter(d => {
        const cId = typeof d.customer === 'object' ? d.customer?._id : d.customer;
        return cId === customerFilter;
      });

  const availableDivisionsForForm = divisions.filter(d => {
    const cId = typeof d.customer === 'object' ? d.customer?._id : d.customer;
    return cId === formData.customer;
  });

  // --- Handlers ---
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setRoleFilter('all');
    setCustomerFilter('all');
    setDivisionFilter('all');
  };

  const handleCustomerFilterChange = (e) => {
    setCustomerFilter(e.target.value);
    setDivisionFilter('all'); 
  };

  const handleOpenCreateModal = () => {
    setEditingUserId(null);
    setFormData(INITIAL_FORM_STATE);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user) => {
    setEditingUserId(user._id);
    
    // Extract the primary address directly from the new userAddress object
    const primaryAddress = user.userAddress || {
      street1: '', street2: '', city: '', state: '', zipCode: '', country: 'US'
    };

    setFormData({
      name: user.name || '',
      email: user.email || '',
      phone: user.phone || '',
      address: {
        street1: primaryAddress.street1 || '',
        street2: primaryAddress.street2 || '',
        city: primaryAddress.city || '',
        state: primaryAddress.state || '',
        zipCode: primaryAddress.zipCode || '',
        country: primaryAddress.country || 'US'
      },
      password: '', 
      portal: user.portal || 'admin',
      role: user.role || 'admin',
      customer: typeof user.customer === 'object' ? user.customer?._id : (user.customer || ''),
      divisions: user.divisions?.map(d => typeof d === 'object' ? d._id : d) || [],
      chargeCode: user.chargeCode || '',
      orderLimit: user.orderLimit ?? '' // ADDED
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingUserId(null);
    setFormData(INITIAL_FORM_STATE);
    dispatch(clearUserErrors());
  };

  const handlePortalChange = (e) => {
    const newPortal = e.target.value;
    setFormData({
      ...formData,
      portal: newPortal,
      role: newPortal === 'admin' ? 'admin' : 'standard',
      customer: newPortal === 'admin' ? '' : formData.customer,
      divisions: newPortal === 'admin' ? [] : formData.divisions,
      chargeCode: newPortal === 'admin' ? '' : formData.chargeCode,
      orderLimit: newPortal === 'admin' ? '' : formData.orderLimit // ADDED
    });
  };

  const handleCustomerChange = (e) => {
    setFormData({
      ...formData,
      customer: e.target.value,
      divisions: [] 
    });
  };

  const handleDivisionToggle = (divId) => {
    setFormData(prev => ({
      ...prev,
      divisions: prev.divisions.includes(divId)
        ? prev.divisions.filter(id => id !== divId)
        : [...prev.divisions, divId]
    }));
  };

  const handleSubmitUser = async (e) => {
    e.preventDefault();
    
    if (formData.portal === 'order') {
      if (!formData.customer) return toast.error('Required Field', {description: 'Users on the Order Portal MUST be assigned to a Customer Account.'});
    }

    // Pass the primary address specifically to userAddress
    const payload = {
      ...formData,
      userAddress: formData.address
    };
    delete payload.address; // Remove the frontend-only 'address' wrapper
    
    // Safely parse orderLimit
    if (payload.portal === 'admin' || payload.orderLimit === '') {
      delete payload.orderLimit; // Let the backend handle missing values safely
    } else {
      payload.orderLimit = Number(payload.orderLimit);
    }

    try {
      if (editingUserId) {
        await dispatch(updateUser({ id: editingUserId, ...payload })).unwrap();
        toast.success("User access updated successfully.");
      } else {
        await dispatch(createUser(payload)).unwrap();
        toast.success("User provisioned successfully.");
      }
      handleCloseModal();
    } catch (err) {
      toast.error('Provisioning Failed', { description: err || "Failed to save user data."});
    }
  };

  const handleDeleteUser = async (id, name) => {
    if (window.confirm(`Are you sure you want to permanently revoke access for ${name}?`)) {
      try {
        await dispatch(deleteUser(id)).unwrap();
        toast.success(`${name} has been removed from the system.`);
      } catch (err) {
        toast.error(`Failed to delete user`, {description: err});
      }
    }
  };

  return (
    <div className="h-full p-6 space-y-6 relative animate-fade-in max-w-[1600px] mx-auto">
      <PageHeader 
        title="System Users" 
        subtitle="Manage access, roles, and credentials for all COBRA personnel and clients." 
      />

      <UserControls 
        activeTab={activeTab}
        handleTabChange={handleTabChange}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        roleFilter={roleFilter}
        setRoleFilter={setRoleFilter}
        customerFilter={customerFilter}
        handleCustomerFilterChange={handleCustomerFilterChange}
        divisionFilter={divisionFilter}
        setDivisionFilter={setDivisionFilter}
        customers={customers}
        availableDivisionsForFilter={availableDivisionsForFilter}
        canManageUsers={canManageUsers}
        handleOpenCreateModal={handleOpenCreateModal}
        isSuperAdmin={isSuperAdmin}
      />


      {!canManageUsers && (
        <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3 shadow-sm">
          <AlertCircle className="text-amber-500 shrink-0 mt-0.5" size={16} />
          <div className="text-xs">
            <p className="font-bold text-amber-800">Standard Access</p>
            <p className="text-amber-700 mt-0.5">You can view the directory, but only Command Center Admins can manage users.</p>
          </div>
        </div>
      )}

      <UserTable 
        status={status}
        filteredUsers={filteredUsers}
        activeTab={activeTab}
        divisions={divisions}
        canManageUsers={canManageUsers}
        isSuperAdmin={isSuperAdmin}
        currentUser={currentUser}
        handleOpenEditModal={handleOpenEditModal}
        handleDeleteUser={handleDeleteUser}
      />

      <UserModal 
        isModalOpen={isModalOpen}
        handleCloseModal={handleCloseModal}
        handleSubmitUser={handleSubmitUser}
        formData={formData}
        setFormData={setFormData}
        editingUserId={editingUserId}
        createStatus={createStatus}
        error={error}
        handlePortalChange={handlePortalChange}
        handleCustomerChange={handleCustomerChange}
        handleDivisionToggle={handleDivisionToggle}
        customers={customers}
        availableDivisionsForForm={availableDivisionsForForm}
        isSuperAdmin={isSuperAdmin}
      />
    </div>
  );
}