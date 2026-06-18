import React, { useState, useEffect } from 'react';
import { X, Loader2, UploadCloud } from 'lucide-react';
import api from '../../utils/api'; // Needed to fetch the presigned URL securely

const INITIAL_FORM_STATE = {
  productCode: '', description: '', description2: '', hssCode: '', division: '',
  category1: '', category2: '', category3: '', typePiece: '', locationString: '',
  admin: false, offWeb: false, status: 'Active', price: 0, price2: 0,
  min: 0, max: 0, lowPoint: 0, lowPoint2: 0, openOrders: 0, available: 0,
  qtyLastReceived: 0, dateLastReceived: '', productImage: '', customer: ''
};

export default function InventoryFormPanel({ 
  itemToEdit, 
  apiCustomers, apiDivisions, apiCategories, 
  onSubmit, onClose 
}) {
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const isEditMode = Boolean(itemToEdit);

  // Initialize form
  useEffect(() => {
    if (isEditMode) {
      setFormData({
        productCode: itemToEdit.productCode || '',
        description: itemToEdit.description || itemToEdit.itemName || '',
        description2: itemToEdit.description2 || '',
        hssCode: itemToEdit.hssCode || '',
        division: itemToEdit.division?._id || itemToEdit.division || '',
        category1: itemToEdit.category1?._id || itemToEdit.category1 || '',
        category2: itemToEdit.category2?._id || itemToEdit.category2 || '',
        category3: itemToEdit.category3?._id || itemToEdit.category3 || '',
        typePiece: itemToEdit.typePiece || '',
        locationString: itemToEdit.locationString || '',
        admin: itemToEdit.admin || false,
        offWeb: itemToEdit.offWeb || false,
        status: itemToEdit.status || 'Active',
        price: itemToEdit.price || 0,
        price2: itemToEdit.price2 || 0,
        min: itemToEdit.min || 0,
        max: itemToEdit.max || 0,
        lowPoint: itemToEdit.lowPoint || 0,
        lowPoint2: itemToEdit.lowPoint2 || 0,
        openOrders: itemToEdit.openOrders || 0,
        available: itemToEdit.available || 0,
        qtyLastReceived: itemToEdit.qtyLastReceived || 0,
        dateLastReceived: itemToEdit.dateLastReceived ? new Date(itemToEdit.dateLastReceived).toISOString().split('T')[0] : '',
        productImage: itemToEdit.productImage || '',
        customer: itemToEdit.customer?._id || itemToEdit.customer || ''
      });
    } else {
      setFormData({
        ...INITIAL_FORM_STATE,
        customer: apiCustomers[0]?._id || '', 
        division: apiDivisions[0]?._id || '',
        category1: apiCategories[0]?._id || '', 
      });
    }
  }, [itemToEdit, apiCustomers, apiDivisions, apiCategories, isEditMode]);

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("Image is too large. Please select an image under 5MB.");
      return;
    }

    setIsUploadingImage(true);

    try {
      const urlResponse = await api.get(`/upload/presigned-url?fileName=${encodeURIComponent(file.name)}&fileType=${encodeURIComponent(file.type)}`);
      const { presignedUrl, finalImageUrl } = urlResponse.data;

      const uploadResponse = await fetch(presignedUrl, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      });

      if (!uploadResponse.ok) throw new Error('Failed to upload to S3');
      
      setFormData(prev => ({ ...prev, productImage: finalImageUrl }));
    } catch (err) {
      console.error("S3 Upload error:", err);
      alert("Failed to upload image. Please try again.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const removeImage = () => setFormData(prev => ({ ...prev, productImage: '' }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.productCode || !formData.description || !formData.customer) {
      alert("Product Code, Description, and Customer are required.");
      return;
    }
    
    setIsSubmitting(true);

    const payload = {
      ...formData,
      itemName: formData.description, // Mongoose requirement fallback
      price: Number(formData.price) || 0,
      price2: Number(formData.price2) || 0,
      min: Number(formData.min) || 0,
      max: Number(formData.max) || 0,
      lowPoint: Number(formData.lowPoint) || 0,
      lowPoint2: Number(formData.lowPoint2) || 0,
      available: Number(formData.available) || 0,
      division: formData.division || null,
      category1: formData.category1 || null,
      category2: formData.category2 || null,
      category3: formData.category3 || null,
    };

    try {
      await onSubmit(payload, isEditMode, itemToEdit?._id);
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputClass = "w-full border border-slate-300 rounded-[4px] px-3 py-1.5 text-sm text-slate-800 focus:outline-none focus:border-brand-gold focus:ring-1 focus:ring-brand-gold";
  const disabledInputClass = "w-full border border-slate-200 bg-slate-100 rounded-[4px] px-3 py-1.5 text-sm text-slate-500 cursor-not-allowed";

  return (
    <form onSubmit={handleSubmit} className="bg-white border border-slate-200 p-8 rounded-md animate-in fade-in slide-in-from-top-4 duration-300 shadow-lg space-y-8">
      
      <div className="flex justify-between items-center pb-4 border-b border-slate-100">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-bold text-slate-800">
            {isEditMode ? `Edit Item: ${formData.productCode}` : 'New Inventory Item'}
          </h3>
          <select required value={formData.customer} onChange={e => setFormData({...formData, customer: e.target.value})} className="border border-slate-300 rounded px-3 py-1 text-sm bg-slate-50 font-semibold text-brand-gold outline-none">
            <option value="" disabled>Select Customer...</option>
            {apiCustomers.map(cust => <option key={cust._id} value={cust._id}>{cust.customerName}</option>)}
          </select>
        </div>
        <button type="button" disabled={isSubmitting} onClick={onClose} className="text-slate-400 hover:text-slate-600 disabled:opacity-50"><X size={20} /></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
        {/* LEFT COLUMN */}
        <div className="space-y-4">
          <div className="flex items-center">
            <label className="w-1/3 text-sm font-semibold text-slate-600">Product Code</label>
            <input required type="text" value={formData.productCode} onChange={e => setFormData({...formData, productCode: e.target.value})} className={`w-2/3 ${inputClass}`} disabled={isSubmitting} />
          </div>
          <div className="flex items-center">
            <label className="w-1/3 text-sm font-semibold text-slate-600">Description</label>
            <input required type="text" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className={`w-2/3 ${inputClass}`} disabled={isSubmitting} />
          </div>
          <div className="flex items-center">
            <label className="w-1/3 text-sm font-semibold text-slate-600">HSS Code</label>
            <input type="text" value={formData.hssCode} onChange={e => setFormData({...formData, hssCode: e.target.value})} className={`w-2/3 ${inputClass}`} disabled={isSubmitting} />
          </div>
          <div className="flex items-center">
            <label className="w-1/3 text-sm font-semibold text-slate-600">Division</label>
            <select value={formData.division} onChange={e => setFormData({...formData, division: e.target.value})} className={`w-2/3 ${inputClass}`} disabled={isSubmitting}>
              <option value="">Select...</option>
              {apiDivisions.map(div => <option key={div._id} value={div._id}>{div.divisionName}</option>)}
            </select>
          </div>
          <div className="flex items-center">
            <label className="w-1/3 text-sm font-semibold text-slate-600">Category 1</label>
            <select value={formData.category1} onChange={e => setFormData({...formData, category1: e.target.value})} className={`w-2/3 ${inputClass}`} disabled={isSubmitting}>
              <option value="">Select...</option>
              {apiCategories.map(cat => <option key={cat._id} value={cat._id}>{cat.categoryName}</option>)}
            </select>
          </div>
          <div className="flex items-center">
            <label className="w-1/3 text-sm font-semibold text-slate-600">Category 2</label>
            <select value={formData.category2} onChange={e => setFormData({...formData, category2: e.target.value})} className={`w-2/3 ${inputClass}`} disabled={isSubmitting}>
              <option value="">Select...</option>
              {apiCategories.map(cat => <option key={cat._id} value={cat._id}>{cat.categoryName}</option>)}
            </select>
          </div>
          <div className="flex items-center">
            <label className="w-1/3 text-sm font-semibold text-slate-600">Category 3</label>
            <select value={formData.category3} onChange={e => setFormData({...formData, category3: e.target.value})} className={`w-2/3 ${inputClass}`} disabled={isSubmitting}>
              <option value="">Select...</option>
              {apiCategories.map(cat => <option key={cat._id} value={cat._id}>{cat.categoryName}</option>)}
            </select>
          </div>
          <div className="flex items-center">
            <label className="w-1/3 text-sm font-semibold text-slate-600">Type Piece</label>
            <select value={formData.typePiece} onChange={e => setFormData({...formData, typePiece: e.target.value})} className={`w-2/3 ${inputClass}`} disabled={isSubmitting}>
              <option value="">Select...</option>
              <option value="Piece">Piece</option>
              <option value="Box">Box</option>
              <option value="Pallet">Pallet</option>
            </select>
          </div>
          <div className="flex items-center">
            <label className="w-1/3 text-sm font-semibold text-slate-600">Locations (+/-)</label>
            <input type="text" placeholder="e.g. B-10-02" value={formData.locationString} onChange={e => setFormData({...formData, locationString: e.target.value})} className={`w-2/3 ${inputClass}`} disabled={isSubmitting} />
          </div>
          <div className="flex items-center pt-2">
            <label className="w-1/3 text-sm font-semibold text-slate-600">Admin</label>
            <input type="checkbox" checked={formData.admin} onChange={e => setFormData({...formData, admin: e.target.checked})} className="w-4 h-4 rounded border-gray-300 text-brand-gold focus:ring-brand-gold" disabled={isSubmitting}/>
          </div>
          <div className="flex items-center pt-2">
            <label className="w-1/3 text-sm font-semibold text-slate-600">Off Web</label>
            <input type="checkbox" checked={formData.offWeb} onChange={e => setFormData({...formData, offWeb: e.target.checked})} className="w-4 h-4 rounded border-gray-300 text-brand-gold focus:ring-brand-gold" disabled={isSubmitting}/>
          </div>
          <div className="flex items-center pt-2">
            <label className="w-1/3 text-sm font-semibold text-slate-600 leading-tight">Date Last<br/>Received</label>
            <input type="date" value={formData.dateLastReceived} readOnly className={`w-2/3 ${disabledInputClass}`} />
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-4">
          <div className="flex items-center">
            <label className="w-1/3 text-sm font-semibold text-slate-600">Status</label>
            <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className={`w-2/3 ${inputClass}`} disabled={isSubmitting}>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Discontinued">Discontinued</option>
            </select>
          </div>
          <div className="flex items-center">
            <label className="w-1/3 text-sm font-semibold text-slate-600">Description 2</label>
            <input type="text" value={formData.description2} onChange={e => setFormData({...formData, description2: e.target.value})} className={`w-2/3 ${inputClass}`} disabled={isSubmitting} />
          </div>
          <div className="flex items-center">
            <label className="w-1/3 text-sm font-semibold text-slate-600">Price</label>
            <input type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} className={`w-2/3 ${inputClass}`} disabled={isSubmitting} />
          </div>
          <div className="flex items-center">
            <label className="w-1/3 text-sm font-semibold text-slate-600">Price 2</label>
            <input type="number" step="0.01" value={formData.price2} onChange={e => setFormData({...formData, price2: e.target.value})} className={`w-2/3 ${inputClass}`} disabled={isSubmitting} />
          </div>
          <div className="flex items-center">
            <label className="w-1/3 text-sm font-semibold text-slate-600">Min</label>
            <input type="number" value={formData.min} onChange={e => setFormData({...formData, min: e.target.value})} className={`w-2/3 ${inputClass}`} disabled={isSubmitting} />
          </div>
          <div className="flex items-center">
            <label className="w-1/3 text-sm font-semibold text-slate-600">Max</label>
            <input type="number" value={formData.max} onChange={e => setFormData({...formData, max: e.target.value})} className={`w-2/3 ${inputClass}`} disabled={isSubmitting} />
          </div>
          <div className="flex items-center">
            <label className="w-1/3 text-sm font-semibold text-slate-600">Low Point</label>
            <input type="number" value={formData.lowPoint} onChange={e => setFormData({...formData, lowPoint: e.target.value})} className={`w-2/3 ${inputClass}`} disabled={isSubmitting} />
          </div>
          <div className="flex items-center">
            <label className="w-1/3 text-sm font-semibold text-slate-600">Low Point 2</label>
            <input type="number" value={formData.lowPoint2} onChange={e => setFormData({...formData, lowPoint2: e.target.value})} className={`w-2/3 ${inputClass}`} disabled={isSubmitting} />
          </div>
          <div className="flex items-center pt-1">
            <label className="w-1/3 text-sm font-semibold text-slate-600">Open Orders</label>
            <input type="number" value={formData.openOrders} readOnly className={`w-2/3 ${disabledInputClass}`} />
          </div>
          <div className="flex items-center">
            <label className="w-1/3 text-sm font-semibold text-slate-600">Available</label>
            <input type="number" value={formData.available} onChange={e => setFormData({...formData, available: e.target.value})} className={`w-2/3 bg-slate-100 ${inputClass}`} disabled={isSubmitting} />
          </div>
          <div className="flex items-center pt-1">
            <label className="w-1/3 text-sm font-semibold text-slate-600 leading-tight">Qty Last<br/>Received</label>
            <input type="number" value={formData.qtyLastReceived} readOnly className={`w-2/3 ${disabledInputClass}`} />
          </div>
        </div>
      </div>

      {/* S3 Image Preview / Upload Area */}
      <div className="mt-8 relative">
        <div className="flex justify-between items-end mb-2">
          <label className="text-sm font-bold text-slate-600">Visual Documentation</label>
          {formData.productImage && (
            <button type="button" onClick={removeImage} className="text-[10px] font-bold text-red-500 uppercase tracking-widest hover:underline">Delete</button>
          )}
        </div>
        
        {formData.productImage ? (
          <div className="w-full border border-slate-200 rounded overflow-hidden shadow-sm">
            <img src={formData.productImage} alt="Product" className="w-full h-auto object-cover" />
          </div>
        ) : (
          <label className={`flex flex-col items-center justify-center w-full h-48 border-2 border-slate-300 border-dashed rounded cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors ${isUploadingImage ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              {isUploadingImage ? (
                <>
                  <Loader2 className="animate-spin text-brand-gold mb-2" size={28} />
                  <p className="text-sm text-slate-500 font-medium">Uploading to Secure Storage...</p>
                </>
              ) : (
                <>
                  <UploadCloud className="text-slate-400 mb-2" size={28} />
                  <p className="mb-1 text-sm text-slate-600 font-bold">Click to upload image</p>
                  <p className="text-xs text-slate-400">AWS S3 Pipeline (Max 5MB)</p>
                </>
              )}
            </div>
            <input type="file" className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleImageUpload} disabled={isUploadingImage} />
          </label>
        )}
      </div>

      <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200 mt-8">
        <button type="button" disabled={isSubmitting} onClick={onClose} className="px-5 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold rounded shadow-sm transition-colors disabled:opacity-50">Cancel</button>
        <button type="submit" disabled={isSubmitting || isUploadingImage} className="flex justify-center items-center min-w-[140px] px-6 py-2.5 bg-brand-gold hover:bg-brand-gold-hover text-white font-bold rounded shadow-md transition-all disabled:opacity-70">
          {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : (isEditMode ? 'Save Changes' : 'Create Item')}
        </button>
      </div>
    </form>
  );
}