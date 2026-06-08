import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { 
  fetchCustomerById, 
  updateCustomer, 
  deleteCustomer,
  clearCurrentCustomer
} from '../store/slices/customerSlice';

export default function EditCustomerDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  // Access Redux state
  const { currentCustomer, status, error } = useSelector((state) => state.customers);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state aligned with the backend Customer model
  const [formData, setFormData] = useState({
    customerName: '',
    contactName: '',
    contactEmail: '',
    contactNumber: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    zip: ''
  });

  // Fetch single customer on mount or ID change
  useEffect(() => {
    if (id) {
      dispatch(fetchCustomerById(id));
    }
    
    // Cleanup function to clear the current customer when leaving the page
    return () => {
      dispatch(clearCurrentCustomer());
    };
  }, [id, dispatch]);

  // Populate form when currentCustomer data arrives from Redux
  useEffect(() => {
    if (currentCustomer) {
      setFormData({
        customerName: currentCustomer.customerName || '',
        contactName: currentCustomer.contactName || '',
        contactEmail: currentCustomer.contactEmail || '',
        contactNumber: currentCustomer.contactNumber || '',
        addressLine1: currentCustomer.address?.line1 || '',
        addressLine2: currentCustomer.address?.line2 || '',
        city: currentCustomer.address?.city || '',
        state: currentCustomer.address?.state || '',
        zip: currentCustomer.address?.zip || ''
      });
    }
  }, [currentCustomer]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      // Re-map the flat form data back into the nested backend schema structure
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
      
      await dispatch(updateCustomer({ id, customerData: payload })).unwrap();
      navigate(`/customers/${id}`); // Navigate back to the details page on success
    } catch (err) {
      console.error("Update failed:", err);
      alert(`Update Failed: ${err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you absolutely sure you want to delete this customer? This action cannot be undone.')) {
      setIsSubmitting(true);
      try {
        await dispatch(deleteCustomer(id)).unwrap();
        navigate('/customers'); // Kick user back to the directory on successful deletion
      } catch (err) {
        console.error("Deletion failed:", err);
        alert(`Deletion Failed: ${err}`);
        setIsSubmitting(false);
      }
    }
  };

  // Render a loading state while fetching initial data
  if (status === 'loading' && !currentCustomer) {
    return (
      <div className="h-full flex items-center justify-center min-h-[600px]">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 className="animate-spin text-brand-gold" size={32} />
          <p className="text-xs font-black uppercase tracking-widest">Loading Customer Data...</p>
        </div>
      </div>
    );
  }

  // Render an error state if the fetch failed
  if (status === 'failed' && error) {
    return (
      <div className="h-full flex flex-col items-center justify-center min-h-[600px] gap-4">
        <div className="bg-red-50 text-red-600 p-6 rounded-3xl text-center text-sm font-bold border border-red-200">
          Failed to load customer: {error}
        </div>
        <button 
          onClick={() => navigate('/customers')}
          className="text-slate-500 hover:text-slate-800 text-sm font-bold underline"
        >
          Return to Directory
        </button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col max-w-[1400px] mx-auto p-6 box-border animate-fade-in">
      
      {/* Header Row */}
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={() => navigate(-1)} 
          className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-sm w-[100px]"
        >
          <ArrowLeft size={16} /> Back
        </button>
        
        <h1 className="text-2xl font-black text-slate-900 tracking-tight text-center flex-1 truncate px-4">
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
              <label className="block text-xs font-bold text-slate-700 mb-2">Customer Name <span className="text-red-500">*</span></label>
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
          <div className="flex justify-end items-center gap-6 pt-10 border-t border-slate-100">
            <button 
              type="button"
              onClick={handleDelete}
              disabled={isSubmitting}
              className="text-sm font-bold text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
            >
              Delete Customer
            </button>
            <button 
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center min-w-[120px] px-8 py-2.5 bg-brand-gold hover:bg-brand-gold-hover text-white rounded-md text-sm font-bold shadow-sm transition-colors disabled:opacity-70"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : 'Save Changes'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}