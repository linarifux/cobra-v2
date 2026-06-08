import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function EditCustomerDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state aligned with the backend Customer model
  const [formData, setFormData] = useState({
    customerName: 'DSM',
    contactName: 'Alex Zenteno',
    contactEmail: 'alex.zenteno@dsm-firmenich.com',
    contactNumber: '636-219-9048',
    addressLine1: '4006 Fulling Mill Street',
    addressLine2: '',
    city: 'St. Charles',
    state: 'MO',
    zip: '63301'
  });

  // Simulated fetch on mount
  useEffect(() => {
    // In production, dispatch a Redux thunk here to fetch customer by ID
    // dispatch(fetchCustomerById(id)).then(res => setFormData(res.payload));
  }, [id]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Production: dispatch(updateCustomer({ id, data: formattedData }))
      const payload = {
        customerName: formData.customerName,
        contactName: formData.contactName,
        contactEmail: formData.contactEmail,
        contactNumber: formData.contactNumber,
        address: {
          line1: formData.addressLine1,
          line2: formData.addressLine2,
          city: formData.city,
          state: formData.state,
          zip: formData.zip
        }
      };
      
      console.log('Committing update:', payload);
      
      // Simulate network request
      await new Promise(resolve => setTimeout(resolve, 800));
      navigate(`/customers/${id}`);
    } catch (error) {
      console.error("Update failed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you absolutely sure you want to delete this customer? This action cannot be undone.')) {
      setIsLoading(true);
      try {
        // Production: dispatch(deleteCustomer(id))
        await new Promise(resolve => setTimeout(resolve, 800));
        navigate('/customers');
      } catch (error) {
        console.error("Deletion failed:", error);
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="h-full flex flex-col max-w-[1400px] mx-auto p-6 box-border">
      
      {/* Header Row */}
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm w-[100px]"
        >
          Back
        </button>
        
        <h1 className="text-2xl font-black text-slate-900 tracking-tight text-center flex-1">
          {formData.customerName || 'Edit Customer'}
        </h1>
        
        <div className="w-[100px]"></div> {/* Invisible spacer to perfectly center the title */}
      </div>

      {/* Main Form Card */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8">
        <h2 className="text-xl font-bold text-slate-800 mb-8">Edit Customer Information</h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Row 1: Core Identity */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Customer Name</label>
              <input 
                required
                type="text"
                name="customerName"
                value={formData.customerName}
                onChange={handleChange}
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-sm font-medium text-slate-900 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold/50 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Contact Name</label>
              <input 
                type="text"
                name="contactName"
                value={formData.contactName}
                onChange={handleChange}
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-sm font-medium text-slate-900 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold/50 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Contact Email Address</label>
              <div className="relative">
                <input 
                  type="email"
                  name="contactEmail"
                  value={formData.contactEmail}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-sm font-medium text-slate-900 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold/50 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Row 2: Contact & Primary Address */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Contact Number</label>
              <input 
                type="text"
                name="contactNumber"
                value={formData.contactNumber}
                onChange={handleChange}
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-sm font-medium text-slate-900 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold/50 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Address Line 1</label>
              <input 
                type="text"
                name="addressLine1"
                value={formData.addressLine1}
                onChange={handleChange}
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-sm font-medium text-slate-900 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold/50 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">Address Line 2</label>
              <input 
                type="text"
                name="addressLine2"
                value={formData.addressLine2}
                onChange={handleChange}
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-sm font-medium text-slate-900 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold/50 transition-all"
              />
            </div>
          </div>

          {/* Row 3: City, State, Zip */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">City</label>
              <input 
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-sm font-medium text-slate-900 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold/50 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">State</label>
              <input 
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-sm font-medium text-slate-900 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold/50 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">ZIP</label>
              <input 
                type="text"
                name="zip"
                value={formData.zip}
                onChange={handleChange}
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-md text-sm font-medium text-slate-900 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold/50 transition-all"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex justify-end items-center gap-6 pt-10">
            <button 
              type="button"
              onClick={handleDelete}
              disabled={isLoading}
              className="text-sm font-bold text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
            >
              Delete
            </button>
            <button 
              type="submit"
              disabled={isLoading}
              className="flex items-center justify-center min-w-[120px] px-8 py-2.5 bg-[#d97706] hover:bg-[#b45309] text-white rounded-md text-sm font-bold shadow-sm transition-colors disabled:opacity-70"
            >
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Edit'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}