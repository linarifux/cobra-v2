import React, { useState, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { X, Loader2, UploadCloud, MapPin } from 'lucide-react';
import { uploadImageToS3 } from '../../store/slices/uploadSlice'; 
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

const INITIAL_FORM_STATE = {
  productCode: '', description: '', description2: '', hssCode: '', division: '',
  category1: '', category2: '', category3: '', typePiece: '', 
  locations: [], // Array of Location ObjectIds
  admin: false, offWeb: false, status: 'Active', price: 0, price2: 0,
  min: 0, max: 0, lowPoint: 0, lowPoint2: 0, openOrders: 0, available: 0,
  qtyLastReceived: 0, dateLastReceived: '', productImage: '', customer: ''
};

// --- FIX 1: Universal Path-Style Sanitizer ---
const sanitizeS3Url = (url) => {
  if (!url) return '';
  try {
    const urlObj = new URL(url);
    const hostParts = urlObj.hostname.split('.s3.');
    if (hostParts.length === 2 && hostParts[0].includes('.')) {
      const bucketName = hostParts[0];
      return `https://s3.amazonaws.com/${bucketName}${urlObj.pathname}`;
    }
  } catch (err) {
    return url;
  }
  return url;
};

// --- PROFESSIONAL ERROR TRANSLATOR ---
const formatErrorMessage = (err) => {
  const errorString = typeof err === 'string' ? err : (err?.message || '');
  
  if (errorString.includes('E11000') || errorString.includes('duplicate key')) {
    return 'This Product Code already exists. Please choose a unique code.';
  }
  if (errorString.includes('validation failed')) {
    return 'Please check your inputs and try again.';
  }
  return errorString || 'An unexpected server error occurred.';
};

export default function InventoryFormPanel({ 
  itemToEdit, 
  apiCustomers, apiDivisions, apiCategories, apiLocations, apiTypePieces,
  onSubmit, onClose 
}) {
  const dispatch = useDispatch();
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);

  // Combobox States
  const [locSearchTerm, setLocSearchTerm] = useState('');
  const [isLocDropdownOpen, setIsLocDropdownOpen] = useState(false);

  const isEditMode = Boolean(itemToEdit);

  // Initialize form
  useEffect(() => {
    if (isEditMode) {
      // Map populated locations from the backend down to an array of IDs
      const mappedLocations = itemToEdit.locations?.map(l => l._id || l) || [];

      // Legacy fallback in case `locations` is empty but `locationString` has data
      if (mappedLocations.length === 0 && itemToEdit.locationString) {
        const legacyNames = itemToEdit.locationString.split(',').map(s => s.trim());
        const matchedIds = apiLocations.filter(loc => legacyNames.includes(loc.designation)).map(loc => loc._id);
        mappedLocations.push(...matchedIds);
      }

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
        locations: mappedLocations,
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
        productImage: sanitizeS3Url(itemToEdit.productImage) || '',
        customer: itemToEdit.customer?._id || itemToEdit.customer || ''
      });
    } else {
      setFormData({
        ...INITIAL_FORM_STATE,
        customer: apiCustomers[0]?._id || '', 
      });
    }
  }, [itemToEdit, apiCustomers, apiDivisions, apiCategories, apiLocations, isEditMode]);

  // --- CASCADING DROPDOWN LOGIC ---
  const availableTypePieces = useMemo(() => {
    if (!formData.customer) return [];
    return apiTypePieces.filter(tp => (tp.customer?._id || tp.customer) === formData.customer);
  }, [apiTypePieces, formData.customer]);

  const availableDivisions = useMemo(() => {
    if (!formData.customer) return [];
    return apiDivisions.filter(div => (div.customer?._id || div.customer) === formData.customer);
  }, [apiDivisions, formData.customer]);

  const availableCategories = useMemo(() => {
    if (!formData.division) return [];
    return apiCategories.filter(cat => (cat.division?._id || cat.division) === formData.division);
  }, [apiCategories, formData.division]);

  const availableCat1 = useMemo(() => availableCategories.filter(cat => !cat.parentCategory), [availableCategories]);

  const availableCat2 = useMemo(() => {
    if (!formData.category1) return [];
    return availableCategories.filter(cat => (cat.parentCategory?._id || cat.parentCategory) === formData.category1);
  }, [availableCategories, formData.category1]);

  const availableCat3 = useMemo(() => {
    if (!formData.category2) return [];
    return availableCategories.filter(cat => (cat.parentCategory?._id || cat.parentCategory) === formData.category2);
  }, [availableCategories, formData.category2]);

  // Dynamic Location Filtering
  const availableFilteredLocations = useMemo(() => {
    if (!locSearchTerm) return apiLocations;
    return apiLocations.filter(loc => 
      loc.designation.toLowerCase().includes(locSearchTerm.toLowerCase()) || 
      loc.storageCategory?.toLowerCase().includes(locSearchTerm.toLowerCase())
    );
  }, [apiLocations, locSearchTerm]);

  // --- HANDLERS ---
  const handleAddLocation = (locId) => {
    if (!formData.locations.includes(locId)) {
      setFormData(prev => ({ ...prev, locations: [...prev.locations, locId] }));
    }
    setLocSearchTerm('');
    setIsLocDropdownOpen(false);
  };

  const handleRemoveLocation = (locId) => {
    setFormData(prev => ({
      ...prev,
      locations: prev.locations.filter(id => id !== locId)
    }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      return toast.warning('File Too Large', { description: 'Please select an image under 5MB.' });
    }

    setIsUploadingImage(true);

    try {
      let finalImageUrl = await dispatch(uploadImageToS3(file)).unwrap();
      finalImageUrl = sanitizeS3Url(finalImageUrl);
      setFormData(prev => ({ ...prev, productImage: finalImageUrl }));
      setIsImageLoading(true); 
    } catch (err) {
      toast.error('Upload Failed', { description: err || 'Failed to upload image to S3. Please try again.' });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const removeImage = () => {
    setFormData(prev => ({ ...prev, productImage: '' }));
    setIsImageLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.productCode || !formData.description || !formData.customer) {
      return toast.warning('Missing Fields', { description: 'Product Code, Description, and Customer are required.' });
    }
    
    setIsSubmitting(true);

    // Create the legacy fallback string from our relational IDs
    const legacyLocationString = formData.locations
      .map(locId => apiLocations.find(l => l._id === locId)?.designation)
      .filter(Boolean)
      .join(', ');

    const payload = {
      ...formData,
      sku: formData.productCode, 
      itemName: formData.description,
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
      // Array of Location IDs for the modern schema
      locations: formData.locations,
      // String of Location Names for legacy schema safety
      locationString: legacyLocationString, 
    };

    try {
      const actionPromise = onSubmit(payload, isEditMode, itemToEdit?._id);
      
      toast.promise(actionPromise, {
        loading: isEditMode ? 'Updating inventory asset...' : 'Provisioning new asset...',
        success: `Asset successfully ${isEditMode ? 'updated' : 'created'}.`,
        error: (err) => formatErrorMessage(err)
      });

      await actionPromise;
    } catch (err) {
      // Silently caught; toast handles the UI error.
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
          
          <select 
            required 
            value={formData.customer} 
            onChange={e => setFormData({
              ...formData, 
              customer: e.target.value, 
              division: '', category1: '', category2: '', category3: '', typePiece: ''
            })} 
            className="border border-slate-300 rounded px-3 py-1 text-sm bg-slate-50 font-semibold text-brand-gold outline-none"
          >
            <option value="" disabled>Select Customer...</option>
            {apiCustomers.map(cust => <option key={cust._id} value={cust._id}>{cust.customerName}</option>)}
          </select>

          <div className="flex items-center">
            <label className="text-sm mr-2 font-semibold text-slate-600">Division</label>
            <select 
              value={formData.division} 
              onChange={e => setFormData({
                ...formData, 
                division: e.target.value, 
                category1: '', category2: '', category3: ''
              })} 
              className={`min-w-[150px] ${inputClass}`} 
              disabled={isSubmitting || !formData.customer || availableDivisions.length === 0}
            >
              <option value="">{formData.customer ? (availableDivisions.length > 0 ? 'Select...' : 'No divisions') : 'Select Customer first...'}</option>
              {availableDivisions.map(div => <option key={div._id} value={div._id}>{div.divisionName}</option>)}
            </select>
          </div>
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
            <label className="w-1/3 text-sm font-semibold text-slate-600">Category 1</label>
            <select 
              value={formData.category1} 
              onChange={e => setFormData({ ...formData, category1: e.target.value, category2: '', category3: '' })} 
              className={`w-2/3 ${inputClass}`} 
              disabled={isSubmitting || !formData.division || availableCat1.length === 0}
            >
              <option value="">{formData.division ? 'Select Category 1...' : 'Select division first...'}</option>
              {availableCat1.map(cat => <option key={cat._id} value={cat._id}>{cat.categoryName}</option>)}
            </select>
          </div>
          <div className="flex items-center">
            <label className="w-1/3 text-sm font-semibold text-slate-600">Category 2</label>
            <select 
              value={formData.category2} 
              onChange={e => setFormData({ ...formData, category2: e.target.value, category3: '' })} 
              className={`w-2/3 ${inputClass}`} 
              disabled={isSubmitting || !formData.category1 || availableCat2.length === 0}
            >
              <option value="">{formData.category1 ? 'Select Category 2...' : 'Select Category 1 first...'}</option>
              {availableCat2.map(cat => <option key={cat._id} value={cat._id}>{cat.categoryName}</option>)}
            </select>
          </div>
          <div className="flex items-center">
            <label className="w-1/3 text-sm font-semibold text-slate-600">Category 3</label>
            <select 
              value={formData.category3} 
              onChange={e => setFormData({...formData, category3: e.target.value})} 
              className={`w-2/3 ${inputClass}`} 
              disabled={isSubmitting || !formData.category2 || availableCat3.length === 0}
            >
              <option value="">{formData.category2 ? 'Select Category 3...' : 'Select Category 2 first...'}</option>
              {availableCat3.map(cat => <option key={cat._id} value={cat._id}>{cat.categoryName}</option>)}
            </select>
          </div>

          <div className="flex items-center">
            <label className="w-1/3 text-sm font-semibold text-slate-600">Type Piece</label>
            <select 
              value={formData.typePiece} 
              onChange={e => setFormData({...formData, typePiece: e.target.value})} 
              className={`w-2/3 ${inputClass}`} 
              disabled={isSubmitting || !formData.customer}
            >
              <option value="">{formData.customer ? 'Select type piece...' : 'Select customer first...'}</option>
              {availableTypePieces.map(tp => (
                <option key={tp._id} value={tp.typePieceName}>{tp.typePieceName}</option>
              ))}
            </select>
          </div>

          <div className="flex items-start pt-1">
            <label className="w-1/3 text-sm font-semibold text-slate-600 mt-2">Locations (+/-)</label>
            <div className="w-2/3 relative">
              <div className="flex flex-wrap gap-1.5 mb-2">
                {formData.locations.map(locId => {
                  const locObj = apiLocations.find(l => l._id === locId);
                  return (
                    <span key={locId} className="bg-slate-100 border border-slate-200 text-slate-700 px-2 py-1 rounded-[4px] flex items-center gap-1.5 text-[10px] font-bold shadow-sm">
                      <MapPin size={10} className="text-emerald-500" />
                      {locObj?.designation || locId}
                      <X size={12} className="cursor-pointer hover:text-red-500 transition-colors ml-1" onClick={() => handleRemoveLocation(locId)} />
                    </span>
                  );
                })}
              </div>
              <input 
                type="text" 
                placeholder={formData.locations.length === 0 ? "Type to search (e.g. A-12)..." : "Add another location..."}
                value={locSearchTerm}
                onChange={(e) => { setLocSearchTerm(e.target.value); setIsLocDropdownOpen(true); }}
                onFocus={() => setIsLocDropdownOpen(true)}
                onBlur={() => setTimeout(() => setIsLocDropdownOpen(false), 200)}
                disabled={isSubmitting}
                className={`${inputClass}`}
              />
              <AnimatePresence>
                {isLocDropdownOpen && (
                  <motion.ul initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-[4px] shadow-xl max-h-48 overflow-y-auto custom-scrollbar">
                    {availableFilteredLocations.length > 0 ? (
                      availableFilteredLocations.map(loc => (
                        <li key={loc._id} onClick={() => handleAddLocation(loc._id)} className="px-3 py-2 hover:bg-brand-gold/10 hover:text-brand-gold cursor-pointer border-b last:border-b-0 border-slate-100 transition-colors flex items-center justify-between">
                          <span className="text-xs font-black">{loc.designation}</span>
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{loc.storageCategory}</span>
                        </li>
                      ))
                    ) : (
                      <li className="px-3 py-2 text-xs font-bold text-slate-400 text-center italic">No matching locations</li>
                    )}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
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
          <div className="w-full border border-slate-200 rounded overflow-hidden shadow-sm relative min-h-37.5 bg-slate-50 flex items-center justify-center">
            {isImageLoading && (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-50/80 backdrop-blur-sm">
                <Loader2 className="animate-spin text-brand-gold mb-2" size={24} />
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Resolving Asset...</span>
              </div>
            )}

            <img 
              src={formData.productImage} 
              alt="Product" 
              className={`w-75 h-auto object-cover transition-opacity duration-300 ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
              onLoad={() => setIsImageLoading(false)} 
              onError={() => {
                setIsImageLoading(false);
              }}
            />
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
        <button type="submit" disabled={isSubmitting || isUploadingImage} className="flex justify-center items-center min-w-35 px-6 py-2.5 bg-brand-gold hover:bg-brand-gold-hover text-white font-bold rounded shadow-md transition-all disabled:opacity-70">
          {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : (isEditMode ? 'Save Changes' : 'Create Item')}
        </button>
      </div>
    </form>
  );
}