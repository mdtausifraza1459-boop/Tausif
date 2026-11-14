import React, { useState } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Copy,
  Download,
  Upload,
  X,
  AlertTriangle,
  Package,
  ArrowUpDown,
  Video,
  Image as ImageIcon,
} from 'lucide-react';
import { Product, Category, StockMovement } from '../../types.ts';

interface CommonProps {
  adminToken: string;
  pushNotice: (type: 'success' | 'error', text: string) => void;
  onRefresh: () => void;
}

export const downloadAuthorizedFile = async (
  url: string,
  filename: string,
  adminToken: string,
  onError: (msg: string) => void
) => {
  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${adminToken}` } });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      onError(err.error || 'Download failed.');
      return;
    }
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  } catch {
    onError('Network failure during file download.');
  }
};

// =================== 1. PRODUCTS CATALOG ===================

export const ProductsCatalogView: React.FC<
  CommonProps & {
    products: Product[];
    categories: Category[];
    canEdit: boolean;
    onRefreshStorefront: () => void;
  }
> = ({ products, categories, adminToken, pushNotice, onRefresh, onRefreshStorefront, canEdit }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'draft' | 'low_stock'>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [csvImportOpen, setCsvImportOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [importing, setImporting] = useState(false);

  const filtered = products.filter((p) => {
    const q = search.trim().toLowerCase();
    const matchesQ =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      (p.brand || '').toLowerCase().includes(q);
    if (!matchesQ) return false;
    if (statusFilter === 'published') return p.isPublished !== false;
    if (statusFilter === 'draft') return p.isPublished === false;
    if (statusFilter === 'low_stock') return p.stockQuantity <= (p.lowStockThreshold || 10);
    return true;
  });

  const handleDuplicate = async (prod: Product) => {
    const res = await fetch(`/api/admin/products/${prod.id}/duplicate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const data = await res.json();
    if (res.ok) {
      pushNotice('success', `Duplicated "${prod.name}" as draft (${data.product?.sku}).`);
      onRefresh();
    } else {
      pushNotice('error', data.error || 'Duplicate failed.');
    }
  };

  const handleDelete = async (prod: Product) => {
    const res = await fetch(`/api/admin/products/${prod.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    setConfirmDeleteId(null);
    if (res.ok) {
      pushNotice('success', `Deleted "${prod.name}".`);
      onRefresh();
      onRefreshStorefront();
    } else {
      const data = await res.json().catch(() => ({}));
      pushNotice('error', data.error || 'Failed to delete product.');
    }
  };

  const handleImportCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvText.trim()) return;
    setImporting(true);
    try {
      const res = await fetch('/api/admin/products/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ csvText }),
      });
      const data = await res.json();
      if (res.ok) {
        pushNotice('success', `CSV Import: Created ${data.created}, Updated ${data.updated} product(s).`);
        setCsvImportOpen(false);
        setCsvText('');
        onRefresh();
        onRefreshStorefront();
      } else {
        pushNotice('error', data.error || 'CSV import failed.');
      }
    } catch {
      pushNotice('error', 'Network error during CSV import.');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#141413]">Products &amp; Variant Catalog</h1>
          <p className="text-xs text-[#63615C]">
            Manage SKUs, cost &amp; wholesale pricing, Size × Colour stock matrices, videos, and scheduled launches
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() =>
              downloadAuthorizedFile(
                '/api/admin/products/export/csv',
                `zohra_products_${new Date().toISOString().slice(0, 10)}.csv`,
                adminToken,
                (m) => pushNotice('error', m)
              )
            }
            className="px-3.5 py-2 bg-white hover:bg-[#F7F6F2] border border-[#E2DFD7] text-[#141413] text-xs font-semibold rounded-md flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#164E3F]" />
            <span>Export CSV</span>
          </button>

          {canEdit && (
            <>
              <button
                type="button"
                onClick={() => setCsvImportOpen(true)}
                className="px-3.5 py-2 bg-white hover:bg-[#F7F6F2] border border-[#E2DFD7] text-[#141413] text-xs font-semibold rounded-md flex items-center gap-1.5 cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-[#8E6D3B]" />
                <span>Bulk Import CSV</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setEditing(null);
                  setModalOpen(true);
                }}
                className="px-4 py-2 bg-[#164E3F] hover:bg-[#0F3A2E] text-white text-xs font-semibold uppercase tracking-wider rounded-md flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Product</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-lg border border-[#E2DFD7] flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#63615C] absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by SKU, garment name, brand, or category..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-[#E2DFD7] rounded-md bg-[#F7F6F2] focus:bg-white focus:outline-none focus:border-[#164E3F]"
          />
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs">
          {[
            { id: 'all', label: `All (${products.length})` },
            { id: 'published', label: 'Published' },
            { id: 'draft', label: 'Drafts' },
            { id: 'low_stock', label: 'Low Stock' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3 py-1.5 rounded-md font-semibold cursor-pointer border ${
                statusFilter === tab.id
                  ? 'bg-[#164E3F] text-white border-[#164E3F]'
                  : 'bg-[#F7F6F2] text-[#63615C] border-[#E2DFD7] hover:text-[#141413]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-[#E2DFD7] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F7F6F2] text-[#63615C] font-semibold border-b border-[#E2DFD7]">
              <tr>
                <th className="p-3">Product &amp; SKU</th>
                <th className="p-3">Category / Brand</th>
                <th className="p-3">Pricing (Offer / MRP / Cost)</th>
                <th className="p-3">Total Stock</th>
                <th className="p-3">Status</th>
                {canEdit && <th className="p-3 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2DFD7]">
              {filtered.map((p) => {
                const isLow = p.stockQuantity <= (p.lowStockThreshold || 10);
                return (
                  <tr key={p.id} className="hover:bg-[#F7F6F2]/70">
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.images[0]}
                          alt={p.name}
                          className="w-11 h-14 object-cover rounded border border-[#E2DFD7] shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-semibold text-[#141413] truncate max-w-[220px]">{p.name}</p>
                          <p className="font-mono text-[10px] text-[#164E3F] font-semibold">{p.sku}</p>
                          <p className="text-[10px] text-[#63615C]">{p.fabric}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <p className="font-medium text-[#141413]">{p.category}</p>
                      <p className="text-[10px] text-[#63615C]">{p.brand}</p>
                    </td>
                    <td className="p-3 font-mono tabular-nums space-y-0.5">
                      <p className="font-bold text-[#141413]">
                        ₹{p.discountedPrice.toLocaleString()}{' '}
                        <span className="line-through text-[10px] text-[#63615C] font-normal">
                          ₹{p.originalPrice.toLocaleString()}
                        </span>
                      </p>
                      <p className="text-[10px] text-[#63615C]">
                        Cost:{' '}
                        {p.costPrice > 0 ? (
                          <span className="text-[#166534] font-semibold">₹{p.costPrice.toLocaleString()}</span>
                        ) : (
                          <span className="text-[#B45309]">Not recorded</span>
                        )}
                      </p>
                      {p.wholesalePrice ? (
                        <p className="text-[10px] text-[#8E6D3B]">
                          B2B: ₹{p.wholesalePrice.toLocaleString()} (MOQ {p.wholesaleMoq || 10})
                        </p>
                      ) : null}
                    </td>
                    <td className="p-3 font-mono tabular-nums">
                      <span
                        className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                          p.stockQuantity === 0
                            ? 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]'
                            : isLow
                            ? 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]'
                            : 'bg-[#ECFDF5] text-[#166534] border-[#A7F3D0]'
                        }`}
                      >
                        {p.stockQuantity} pcs
                      </span>
                      <p className="text-[10px] text-[#63615C] mt-1">
                        {Object.keys(p.variantStock || {}).length} variants
                      </p>
                    </td>
                    <td className="p-3">
                      {p.isPublished === false ? (
                        <span className="px-2 py-0.5 bg-[#F7F6F2] text-[#63615C] border border-[#E2DFD7] rounded text-[10px] font-bold uppercase">
                          Draft
                        </span>
                      ) : p.scheduledPublishAt && new Date(p.scheduledPublishAt).getTime() > Date.now() ? (
                        <span className="px-2 py-0.5 bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A] rounded text-[10px] font-bold uppercase">
                          Scheduled
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-[#ECFDF5] text-[#166534] border border-[#A7F3D0] rounded text-[10px] font-bold uppercase">
                          Live
                        </span>
                      )}
                    </td>
                    {canEdit && (
                      <td className="p-3 text-right">
                        {confirmDeleteId === p.id ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleDelete(p)}
                              className="px-2 py-1 bg-[#B91C1C] text-white rounded text-[11px] font-semibold cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 border border-[#E2DFD7] rounded text-[11px] cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setEditing(p);
                                setModalOpen(true);
                              }}
                              title="Edit Product"
                              className="p-1.5 border border-[#E2DFD7] hover:border-[#164E3F] rounded text-[#141413] hover:text-[#164E3F] cursor-pointer"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDuplicate(p)}
                              title="Duplicate as Draft"
                              className="p-1.5 border border-[#E2DFD7] hover:border-[#8E6D3B] rounded text-[#141413] hover:text-[#8E6D3B] cursor-pointer"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(p.id)}
                              title="Delete Product"
                              className="p-1.5 border border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C] rounded cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk CSV Import Modal */}
      {csvImportOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs p-4 flex items-center justify-center">
          <div className="bg-white rounded-xl border border-[#E2DFD7] max-w-2xl w-full p-6 space-y-4 text-xs shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-3">
              <h3 className="font-serif text-lg font-bold text-[#141413]">Bulk Product CSV Import</h3>
              <button type="button" onClick={() => setCsvImportOpen(false)} className="cursor-pointer">
                <X className="w-5 h-5 text-[#63615C]" />
              </button>
            </div>
            <p className="text-[#63615C]">
              Upload an exported Zohra Luxe CSV or paste rows with headers:{' '}
              <code className="font-mono text-[#141413]">
                sku,name,brand,category,fabric,costPrice,originalPrice,discountedPrice,stockQuantity,sizes,colors,isPublished,description
              </code>
            </p>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => setCsvText(String(reader.result || ''));
                reader.readAsText(file);
              }}
              className="block w-full text-xs text-[#63615C] file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:border-[#E2DFD7] file:bg-[#F7F6F2] file:text-[#141413] file:font-semibold"
            />
            <form onSubmit={handleImportCsv} className="space-y-3">
              <textarea
                rows={8}
                required
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="Paste CSV content here..."
                className="w-full p-3 border border-[#E2DFD7] rounded-md font-mono text-[11px] bg-[#F7F6F2]"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCsvImportOpen(false)}
                  className="px-4 py-2 border border-[#E2DFD7] rounded-md font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={importing}
                  className="px-5 py-2 bg-[#164E3F] text-white rounded-md font-semibold cursor-pointer disabled:opacity-50"
                >
                  {importing ? 'Importing...' : 'Run CSV Import'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {modalOpen && (
        <ProductFormModal
          product={editing}
          categories={categories}
          adminToken={adminToken}
          onClose={() => {
            setModalOpen(false);
            setEditing(null);
          }}
          onError={(m) => pushNotice('error', m)}
          onSaved={() => {
            setModalOpen(false);
            setEditing(null);
            pushNotice('success', 'Product saved successfully.');
            onRefresh();
            onRefreshStorefront();
          }}
        />
      )}
    </div>
  );
};

// =================== PRODUCT FORM MODAL (WITH VARIANT MATRIX + VIDEOS + COST) ===================

const ProductFormModal: React.FC<{
  product: Product | null;
  categories: Category[];
  adminToken: string;
  onClose: () => void;
  onSaved: () => void;
  onError: (msg: string) => void;
}> = ({ product, categories, adminToken, onClose, onSaved, onError }) => {
  const [sku, setSku] = useState(product?.sku || '');
  const [name, setName] = useState(product?.name || '');
  const [brand, setBrand] = useState(product?.brand || 'Zohra Luxe');
  const [supplier, setSupplier] = useState(product?.supplier || '');
  const [category, setCategory] = useState(product?.category || categories[0]?.name || "Women's Kurtis");
  const [costPrice, setCostPrice] = useState<number>(product?.costPrice || 0);
  const [originalPrice, setOriginalPrice] = useState<number>(product?.originalPrice || 2999);
  const [discountedPrice, setDiscountedPrice] = useState<number>(product?.discountedPrice || 1799);
  const [wholesalePrice, setWholesalePrice] = useState<number>(product?.wholesalePrice || 0);
  const [wholesaleMoq, setWholesaleMoq] = useState<number>(product?.wholesaleMoq || 10);
  const [lowStockThreshold, setLowStockThreshold] = useState<number>(product?.lowStockThreshold || 10);

  const [fabric, setFabric] = useState(product?.fabric || 'Pure Chanderi Silk');
  const [sleeveType, setSleeveType] = useState(product?.sleeveType || 'Three-Quarter');
  const [kurtiLength, setKurtiLength] = useState(product?.kurtiLength || 'Calf-Length');
  const [occasion, setOccasion] = useState(product?.occasion || 'Festive Wear');
  const [description, setDescription] = useState(product?.description || '');

  const [sizes, setSizes] = useState<string[]>(
    product?.sizes?.length ? product.sizes : ['XS', 'S', 'M', 'L', 'XL']
  );
  const [newSizeInput, setNewSizeInput] = useState('');
  const [colors, setColors] = useState<{ name: string; hex: string }[]>(
    product?.colors?.length ? product.colors : [{ name: 'Blush Pink', hex: '#E8C5C8' }]
  );
  const [newColorName, setNewColorName] = useState('');
  const [newColorHex, setNewColorHex] = useState('#164E3F');

  const [variantStock, setVariantStock] = useState<Record<string, number>>(() => {
    if (product?.variantStock && Object.keys(product.variantStock).length > 0) {
      return { ...product.variantStock };
    }
    const init: Record<string, number> = {};
    (product?.sizes || ['XS', 'S', 'M', 'L', 'XL']).forEach((s) => {
      (product?.colors || [{ name: 'Blush Pink', hex: '#E8C5C8' }]).forEach((c) => {
        init[`${s}::${c.name}`] = 5;
      });
    });
    return init;
  });

  const [isNewArrival, setIsNewArrival] = useState(product?.isNewArrival ?? true);
  const [isBestSeller, setIsBestSeller] = useState(product?.isBestSeller ?? false);
  const [isTrending, setIsTrending] = useState(product?.isTrending ?? false);
  const [isPublished, setIsPublished] = useState(product?.isPublished ?? true);
  const [scheduledPublishAt, setScheduledPublishAt] = useState(
    product?.scheduledPublishAt ? product.scheduledPublishAt.slice(0, 16) : ''
  );

  const [images, setImages] = useState<string[]>(
    product?.images?.length
      ? product.images
      : ['/src/assets/images/category_kurtis_showcase_1794109164419.jpg']
  );
  const [newImageUrl, setNewImageUrl] = useState('');
  const [videos, setVideos] = useState<string[]>(product?.videos || []);
  const [newVideoUrl, setNewVideoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const totalMatrixStock = sizes.reduce(
    (sum, sz) => sum + colors.reduce((cs, col) => cs + (Number(variantStock[`${sz}::${col.name}`]) || 0), 0),
    0
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const cleanedMatrix: Record<string, number> = {};
      sizes.forEach((s) => {
        colors.forEach((c) => {
          const key = `${s}::${c.name}`;
          cleanedMatrix[key] = Math.max(0, Math.floor(Number(variantStock[key]) || 0));
        });
      });

      const payload = {
        sku: sku.trim() || undefined,
        name,
        brand,
        supplier: supplier.trim() || undefined,
        category,
        costPrice: Number(costPrice) || 0,
        originalPrice: Number(originalPrice),
        discountedPrice: Number(discountedPrice),
        wholesalePrice: wholesalePrice > 0 ? Number(wholesalePrice) : undefined,
        wholesaleMoq: wholesalePrice > 0 ? Number(wholesaleMoq) || 10 : undefined,
        lowStockThreshold: Number(lowStockThreshold) || 10,
        sizes,
        colors,
        variantStock: cleanedMatrix,
        stockQuantity: totalMatrixStock,
        fabric,
        sleeveType,
        kurtiLength,
        occasion,
        description,
        isNewArrival,
        isBestSeller,
        isTrending,
        isPublished,
        scheduledPublishAt: scheduledPublishAt ? new Date(scheduledPublishAt).toISOString() : undefined,
        images,
        videos,
      };

      const url = product ? `/api/admin/products/${product.id}` : '/api/admin/products';
      const method = product ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        onSaved();
      } else {
        onError(data.error || 'Failed to save product.');
      }
    } catch {
      onError('Network error saving product.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs p-4 flex items-center justify-center">
      <div className="relative w-full max-w-3xl bg-white rounded-xl shadow-2xl border border-[#E2DFD7] p-6 space-y-4 my-auto max-h-[92vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-3">
          <h3 className="font-serif text-xl font-bold text-[#141413]">
            {product ? `Edit Product: ${product.name}` : 'Create New Product'}
          </h3>
          <button type="button" onClick={onClose} className="cursor-pointer">
            <X className="w-5 h-5 text-[#63615C]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="font-semibold block mb-1">Garment Title *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2.5 border border-[#E2DFD7] rounded-md bg-[#F7F6F2]"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Unique SKU (auto if blank)</label>
              <input
                type="text"
                value={sku}
                onChange={(e) => setSku(e.target.value.toUpperCase())}
                placeholder="e.g. ZL-ANRK-009"
                className="w-full p-2.5 border border-[#E2DFD7] rounded-md bg-[#F7F6F2] font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="font-semibold block mb-1">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full p-2.5 border border-[#E2DFD7] rounded-md bg-[#F7F6F2]"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-semibold block mb-1">Brand</label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full p-2.5 border border-[#E2DFD7] rounded-md bg-[#F7F6F2]"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Supplier (Optional)</label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="Jaipur Artisan Looms"
                className="w-full p-2.5 border border-[#E2DFD7] rounded-md bg-[#F7F6F2]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div>
              <label className="font-semibold block mb-1">Cost Price (INR)</label>
              <input
                type="number"
                min={0}
                value={costPrice}
                onChange={(e) => setCostPrice(Number(e.target.value))}
                className="w-full p-2.5 border border-[#E2DFD7] rounded-md bg-[#F7F6F2] font-mono"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">MRP (INR) *</label>
              <input
                type="number"
                min={1}
                required
                value={originalPrice}
                onChange={(e) => setOriginalPrice(Number(e.target.value))}
                className="w-full p-2.5 border border-[#E2DFD7] rounded-md bg-[#F7F6F2] font-mono"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Selling Price *</label>
              <input
                type="number"
                min={1}
                required
                value={discountedPrice}
                onChange={(e) => setDiscountedPrice(Number(e.target.value))}
                className="w-full p-2.5 border border-[#E2DFD7] rounded-md bg-[#F7F6F2] font-mono"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">B2B Wholesale (INR)</label>
              <input
                type="number"
                min={0}
                value={wholesalePrice}
                onChange={(e) => setWholesalePrice(Number(e.target.value))}
                className="w-full p-2.5 border border-[#E2DFD7] rounded-md bg-[#F7F6F2] font-mono"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">B2B MOQ / Low Alert</label>
              <div className="flex gap-1">
                <input
                  type="number"
                  min={1}
                  title="Wholesale MOQ"
                  value={wholesaleMoq}
                  onChange={(e) => setWholesaleMoq(Number(e.target.value))}
                  className="w-1/2 p-2.5 border border-[#E2DFD7] rounded-md bg-[#F7F6F2] font-mono"
                />
                <input
                  type="number"
                  min={1}
                  title="Low Stock Threshold"
                  value={lowStockThreshold}
                  onChange={(e) => setLowStockThreshold(Number(e.target.value))}
                  className="w-1/2 p-2.5 border border-[#E2DFD7] rounded-md bg-[#F7F6F2] font-mono"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="font-semibold block mb-1">Fabric *</label>
              <input
                type="text"
                required
                value={fabric}
                onChange={(e) => setFabric(e.target.value)}
                className="w-full p-2.5 border border-[#E2DFD7] rounded-md bg-[#F7F6F2]"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Sleeve Type</label>
              <input
                type="text"
                value={sleeveType}
                onChange={(e) => setSleeveType(e.target.value)}
                className="w-full p-2.5 border border-[#E2DFD7] rounded-md bg-[#F7F6F2]"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Kurti Length</label>
              <input
                type="text"
                value={kurtiLength}
                onChange={(e) => setKurtiLength(e.target.value)}
                className="w-full p-2.5 border border-[#E2DFD7] rounded-md bg-[#F7F6F2]"
              />
            </div>
            <div>
              <label className="font-semibold block mb-1">Occasion</label>
              <input
                type="text"
                value={occasion}
                onChange={(e) => setOccasion(e.target.value)}
                className="w-full p-2.5 border border-[#E2DFD7] rounded-md bg-[#F7F6F2]"
              />
            </div>
          </div>

          {/* Sizes & Colors Configuration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3.5 bg-[#F7F6F2] rounded-lg border border-[#E2DFD7]">
            <div className="space-y-2">
              <label className="font-bold text-[#141413] block">Available Sizes</label>
              <div className="flex flex-wrap gap-1.5">
                {sizes.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-[#E2DFD7] rounded font-mono font-semibold"
                  >
                    {s}
                    {sizes.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setSizes(sizes.filter((x) => x !== s))}
                        className="text-[#B91C1C] cursor-pointer"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newSizeInput}
                  onChange={(e) => setNewSizeInput(e.target.value.toUpperCase())}
                  placeholder="Add size (e.g. XXL)"
                  className="flex-1 p-1.5 border border-[#E2DFD7] rounded bg-white font-mono"
                />
                <button
                  type="button"
                  onClick={() => {
                    const s = newSizeInput.trim();
                    if (s && !sizes.includes(s)) {
                      setSizes([...sizes, s]);
                      setNewSizeInput('');
                    }
                  }}
                  className="px-3 py-1.5 bg-[#141413] text-white rounded font-semibold cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="font-bold text-[#141413] block">Available Colours</label>
              <div className="flex flex-wrap gap-1.5">
                {colors.map((c) => (
                  <span
                    key={c.name}
                    className="inline-flex items-center gap-1.5 px-2 py-1 bg-white border border-[#E2DFD7] rounded"
                  >
                    <span
                      className="w-3 h-3 rounded-full border border-[#E2DFD7]"
                      style={{ backgroundColor: c.hex }}
                    />
                    <span className="font-semibold">{c.name}</span>
                    {colors.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setColors(colors.filter((x) => x.name !== c.name))}
                        className="text-[#B91C1C] cursor-pointer"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newColorName}
                  onChange={(e) => setNewColorName(e.target.value)}
                  placeholder="Colour name"
                  className="flex-1 p-1.5 border border-[#E2DFD7] rounded bg-white"
                />
                <input
                  type="color"
                  value={newColorHex}
                  onChange={(e) => setNewColorHex(e.target.value)}
                  className="w-9 h-8 p-0.5 border border-[#E2DFD7] rounded bg-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    const cn = newColorName.trim();
                    if (cn && !colors.some((c) => c.name.toLowerCase() === cn.toLowerCase())) {
                      setColors([...colors, { name: cn, hex: newColorHex }]);
                      setNewColorName('');
                    }
                  }}
                  className="px-3 py-1.5 bg-[#141413] text-white rounded font-semibold cursor-pointer"
                >
                  Add
                </button>
              </div>
            </div>
          </div>

          {/* Size × Colour Stock Matrix */}
          <div className="p-3.5 bg-[#F7F6F2] rounded-lg border border-[#E2DFD7] space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-[#141413]">Size × Colour Stock Matrix</span>
              <span className="font-mono font-bold text-[#164E3F]">Total Stock: {totalMatrixStock} pcs</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[11px] text-[#63615C]">
                    <th className="py-1.5 pr-3">Colour \ Size</th>
                    {sizes.map((s) => (
                      <th key={s} className="py-1.5 px-1.5 font-mono text-center">
                        {s}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {colors.map((c) => (
                    <tr key={c.name} className="border-t border-[#E2DFD7]">
                      <td className="py-1.5 pr-3 font-semibold whitespace-nowrap">{c.name}</td>
                      {sizes.map((s) => {
                        const key = `${s}::${c.name}`;
                        return (
                          <td key={key} className="p-1">
                            <input
                              type="number"
                              min={0}
                              value={variantStock[key] ?? 0}
                              onChange={(e) =>
                                setVariantStock((prev) => ({
                                  ...prev,
                                  [key]: Math.max(0, Number(e.target.value)),
                                }))
                              }
                              className="w-16 p-1 text-center border border-[#E2DFD7] rounded bg-white font-mono"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <label className="font-semibold block mb-1">Description *</label>
            <textarea
              rows={3}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-2.5 border border-[#E2DFD7] rounded-md bg-[#F7F6F2]"
            />
          </div>

          {/* Images & Video Gallery */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 p-3 bg-[#F7F6F2] rounded-lg border border-[#E2DFD7]">
              <label className="font-bold flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5 text-[#164E3F]" /> Image Gallery ({images.length})
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newImageUrl}
                  onChange={(e) => setNewImageUrl(e.target.value)}
                  placeholder="https://... image URL"
                  className="flex-1 p-1.5 border border-[#E2DFD7] rounded bg-white font-mono"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newImageUrl.trim()) {
                      setImages([...images, newImageUrl.trim()]);
                      setNewImageUrl('');
                    }
                  }}
                  className="px-3 py-1 bg-[#141413] text-white rounded font-semibold cursor-pointer"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {images.map((img, i) => (
                  <div key={i} className="relative group">
                    <img src={img} alt="Gallery" className="w-12 h-14 object-cover rounded border border-[#E2DFD7]" />
                    {images.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setImages(images.filter((_, idx) => idx !== i))}
                        className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#B91C1C] text-white text-[10px] flex items-center justify-center cursor-pointer"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 p-3 bg-[#F7F6F2] rounded-lg border border-[#E2DFD7]">
              <label className="font-bold flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5 text-[#8E6D3B]" /> Video Gallery ({videos.length})
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newVideoUrl}
                  onChange={(e) => setNewVideoUrl(e.target.value)}
                  placeholder="https://... MP4 / WebM video URL"
                  className="flex-1 p-1.5 border border-[#E2DFD7] rounded bg-white font-mono"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newVideoUrl.trim()) {
                      setVideos([...videos, newVideoUrl.trim()]);
                      setNewVideoUrl('');
                    }
                  }}
                  className="px-3 py-1 bg-[#141413] text-white rounded font-semibold cursor-pointer"
                >
                  Add
                </button>
              </div>
              <div className="space-y-1">
                {videos.map((vid, i) => (
                  <div key={i} className="flex items-center justify-between bg-white px-2 py-1 rounded border border-[#E2DFD7]">
                    <span className="truncate font-mono text-[10px] max-w-[180px]">{vid}</span>
                    <button
                      type="button"
                      onClick={() => setVideos(videos.filter((_, idx) => idx !== i))}
                      className="text-[#B91C1C] font-bold cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Publication & Flags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center p-3.5 bg-[#F7F6F2] rounded-lg border border-[#E2DFD7]">
            <div className="flex flex-wrap gap-4">
              <label className="inline-flex items-center gap-1.5 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPublished}
                  onChange={(e) => setIsPublished(e.target.checked)}
                />
                Published (Live)
              </label>
              <label className="inline-flex items-center gap-1.5 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={isNewArrival}
                  onChange={(e) => setIsNewArrival(e.target.checked)}
                />
                New Arrival
              </label>
              <label className="inline-flex items-center gap-1.5 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={isBestSeller}
                  onChange={(e) => setIsBestSeller(e.target.checked)}
                />
                Best Seller
              </label>
              <label className="inline-flex items-center gap-1.5 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={isTrending}
                  onChange={(e) => setIsTrending(e.target.checked)}
                />
                Trending
              </label>
            </div>
            <div>
              <label className="font-semibold block mb-1 text-[11px]">Scheduled Publish Date/Time (Optional)</label>
              <input
                type="datetime-local"
                value={scheduledPublishAt}
                onChange={(e) => setScheduledPublishAt(e.target.value)}
                className="w-full p-2 border border-[#E2DFD7] rounded bg-white font-mono"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-[#E2DFD7] rounded-md font-semibold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-[#164E3F] hover:bg-[#0F3A2E] text-white font-semibold uppercase tracking-wider rounded-md cursor-pointer disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Save Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// =================== 2. INVENTORY MANAGEMENT ===================

export const InventoryManagementView: React.FC<
  CommonProps & {
    products: Product[];
    lowStockItems: Product[];
    stockMovements: StockMovement[];
    canAdjust: boolean;
    onRefreshStorefront: () => void;
  }
> = ({ products, lowStockItems, stockMovements, adminToken, pushNotice, onRefresh, onRefreshStorefront, canAdjust }) => {
  const [subTab, setSubTab] = useState<'matrix' | 'low_stock' | 'movements'>('matrix');
  const [adjustingProd, setAdjustingProd] = useState<Product | null>(null);
  const [selSize, setSelSize] = useState('');
  const [selColor, setSelColor] = useState('');
  const [newQty, setNewQty] = useState(0);
  const [reason, setReason] = useState('Warehouse restock');
  const [saving, setSaving] = useState(false);

  const openAdjust = (p: Product, size?: string, color?: string) => {
    const s = size || p.sizes[0] || 'M';
    const c = color || p.colors[0]?.name || 'Standard';
    const key = `${s}::${c}`;
    setAdjustingProd(p);
    setSelSize(s);
    setSelColor(c);
    setNewQty(p.variantStock?.[key] ?? p.stockQuantity ?? 0);
  };

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProd) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/inventory/${adjustingProd.id}/adjust`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ size: selSize, color: selColor, newQuantity: newQty, reason }),
      });
      const data = await res.json();
      if (res.ok) {
        pushNotice('success', `Updated ${adjustingProd.name} (${selSize}, ${selColor}) to ${newQty} pcs.`);
        setAdjustingProd(null);
        onRefresh();
        onRefreshStorefront();
      } else {
        pushNotice('error', data.error || 'Failed to adjust inventory.');
      }
    } catch {
      pushNotice('error', 'Network error adjusting stock.');
    } finally {
      setSaving(false);
    }
  };

  const displayProducts = subTab === 'low_stock' ? lowStockItems : products;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#141413]">Inventory &amp; Stock Ledger</h1>
          <p className="text-xs text-[#63615C]">
            Size &amp; colour-wise stock control, low-stock alerts, and immutable movement audit trail
          </p>
        </div>

        <div className="flex gap-2 text-xs">
          {[
            { id: 'matrix', label: `All Variants (${products.length})` },
            { id: 'low_stock', label: `Low / Out of Stock (${lowStockItems.length})` },
            { id: 'movements', label: `Movement History (${stockMovements.length})` },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSubTab(t.id as any)}
              className={`px-3 py-2 rounded-md font-semibold cursor-pointer border ${
                subTab === t.id
                  ? 'bg-[#164E3F] text-white border-[#164E3F]'
                  : 'bg-white text-[#63615C] border-[#E2DFD7]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {lowStockItems.length > 0 && subTab !== 'movements' && (
        <div className="p-3.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg text-xs text-[#92400E] flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 text-[#B45309]" />
          <span>
            <strong>{lowStockItems.length} product(s)</strong> are at or below their low-stock threshold. Restock variants below to avoid missed sales.
          </span>
        </div>
      )}

      {subTab !== 'movements' ? (
        <div className="space-y-3">
          {displayProducts.map((p) => (
            <div key={p.id} className="bg-white rounded-lg border border-[#E2DFD7] p-4 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E2DFD7] pb-3">
                <div className="flex items-center gap-3">
                  <img src={p.images[0]} alt={p.name} className="w-10 h-12 object-cover rounded border border-[#E2DFD7]" />
                  <div>
                    <p className="font-semibold text-sm text-[#141413]">{p.name}</p>
                    <p className="font-mono text-[11px] text-[#63615C]">
                      SKU: <strong className="text-[#164E3F]">{p.sku}</strong> · Threshold: {p.lowStockThreshold || 10}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`px-2.5 py-1 rounded text-xs font-mono font-bold border ${
                      p.stockQuantity === 0
                        ? 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]'
                        : p.stockQuantity <= (p.lowStockThreshold || 10)
                        ? 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]'
                        : 'bg-[#ECFDF5] text-[#166534] border-[#A7F3D0]'
                    }`}
                  >
                    Total: {p.stockQuantity} pcs
                  </span>
                  {canAdjust && (
                    <button
                      type="button"
                      onClick={() => openAdjust(p)}
                      className="px-3 py-1 bg-[#164E3F] text-white text-xs font-semibold rounded cursor-pointer"
                    >
                      Adjust Stock
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {p.sizes.map((s) =>
                  p.colors.map((c) => {
                    const key = `${s}::${c.name}`;
                    const qty = p.variantStock?.[key] ?? 0;
                    return (
                      <button
                        key={key}
                        type="button"
                        disabled={!canAdjust}
                        onClick={() => openAdjust(p, s, c.name)}
                        className={`px-2.5 py-1.5 rounded border text-[11px] font-mono flex items-center gap-1.5 cursor-pointer disabled:cursor-default ${
                          qty === 0
                            ? 'bg-[#FEF2F2] border-[#FECACA] text-[#B91C1C]'
                            : qty <= 3
                            ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#B45309]'
                            : 'bg-[#F7F6F2] border-[#E2DFD7] text-[#141413] hover:border-[#164E3F]'
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full border border-[#E2DFD7]" style={{ backgroundColor: c.hex }} />
                        <span>
                          {s} · {c.name}:
                        </span>
                        <strong>{qty}</strong>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-[#E2DFD7] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#F7F6F2] text-[#63615C] font-semibold border-b border-[#E2DFD7]">
                <tr>
                  <th className="p-3">Time</th>
                  <th className="p-3">Product / SKU</th>
                  <th className="p-3">Variant</th>
                  <th className="p-3">Change</th>
                  <th className="p-3">Stock (Prev → New)</th>
                  <th className="p-3">Reason / Ref</th>
                  <th className="p-3">Actor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2DFD7]">
                {stockMovements.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-[#63615C]">
                      No stock movement history recorded yet.
                    </td>
                  </tr>
                ) : (
                  stockMovements.map((m) => (
                    <tr key={m.id} className="hover:bg-[#F7F6F2]">
                      <td className="p-3 font-mono text-[10px] text-[#63615C]">
                        {new Date(m.timestamp).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <p className="font-semibold text-[#141413]">{m.productName}</p>
                        <p className="font-mono text-[10px] text-[#164E3F]">{m.sku}</p>
                      </td>
                      <td className="p-3 font-mono text-[11px]">{m.variantKey || 'All'}</td>
                      <td className="p-3 font-mono font-bold">
                        <span className={m.delta >= 0 ? 'text-[#166534]' : 'text-[#B91C1C]'}>
                          {m.delta >= 0 ? `+${m.delta}` : m.delta}
                        </span>
                      </td>
                      <td className="p-3 font-mono tabular-nums">
                        {m.previousStock} → <strong>{m.newStock}</strong>
                      </td>
                      <td className="p-3">
                        <span className="uppercase text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#F7F6F2] border border-[#E2DFD7]">
                          {m.reason.replace('_', ' ')}
                        </span>
                        {m.referenceId && (
                          <span className="block text-[10px] text-[#63615C] font-mono mt-0.5">{m.referenceId}</span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-[10px] text-[#63615C]">{m.actorEmail}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {adjustingProd && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs p-4 flex items-center justify-center">
          <div className="bg-white rounded-xl border border-[#E2DFD7] max-w-md w-full p-6 space-y-4 text-xs shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-3">
              <h3 className="font-serif text-lg font-bold flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-[#164E3F]" /> Adjust Variant Stock
              </h3>
              <button type="button" onClick={() => setAdjustingProd(null)} className="cursor-pointer">
                <X className="w-5 h-5 text-[#63615C]" />
              </button>
            </div>
            <p className="font-semibold text-[#141413]">
              {adjustingProd.name} <span className="font-mono text-[#164E3F]">({adjustingProd.sku})</span>
            </p>
            <form onSubmit={handleAdjust} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold block mb-1">Size</label>
                  <select
                    value={selSize}
                    onChange={(e) => {
                      const s = e.target.value;
                      setSelSize(s);
                      setNewQty(adjustingProd.variantStock?.[`${s}::${selColor}`] ?? 0);
                    }}
                    className="w-full p-2 border border-[#E2DFD7] rounded bg-[#F7F6F2]"
                  >
                    {adjustingProd.sizes.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold block mb-1">Colour</label>
                  <select
                    value={selColor}
                    onChange={(e) => {
                      const c = e.target.value;
                      setSelColor(c);
                      setNewQty(adjustingProd.variantStock?.[`${selSize}::${c}`] ?? 0);
                    }}
                    className="w-full p-2 border border-[#E2DFD7] rounded bg-[#F7F6F2]"
                  >
                    {adjustingProd.colors.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="font-semibold block mb-1">New Exact Stock Quantity</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={newQty}
                  onChange={(e) => setNewQty(Math.max(0, Number(e.target.value)))}
                  className="w-full p-2.5 border border-[#E2DFD7] rounded font-mono bg-[#F7F6F2]"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Reason / Note</label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full p-2.5 border border-[#E2DFD7] rounded bg-[#F7F6F2]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustingProd(null)}
                  className="px-4 py-2 border border-[#E2DFD7] rounded font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-[#164E3F] text-white rounded font-semibold cursor-pointer disabled:opacity-50"
                >
                  {saving ? 'Updating...' : 'Apply Stock Update'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// =================== 3. CATEGORIES MANAGEMENT ===================

export const CategoriesManagementView: React.FC<
  CommonProps & {
    categories: Category[];
    onRefreshStorefront: () => void;
  }
> = ({ categories, adminToken, pushNotice, onRefresh, onRefreshStorefront }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState('/src/assets/images/category_kurtis_showcase_1794109164419.jpg');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const openModal = (cat?: Category) => {
    setEditing(cat || null);
    setName(cat?.name || '');
    setDescription(cat?.description || '');
    setImage(cat?.image || '/src/assets/images/category_kurtis_showcase_1794109164419.jpg');
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const url = editing ? `/api/admin/categories/${editing.id}` : '/api/admin/categories';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({ name, description, image }),
      });
      if (res.ok) {
        pushNotice('success', editing ? `Category "${name}" updated.` : `Category "${name}" created.`);
        setModalOpen(false);
        onRefresh();
        onRefreshStorefront();
      } else {
        const d = await res.json().catch(() => ({}));
        pushNotice('error', d.error || 'Failed to save category.');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cat: Category) => {
    const res = await fetch(`/api/admin/categories/${cat.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    setConfirmDeleteId(null);
    if (res.ok) {
      pushNotice('success', `Deleted category "${cat.name}".`);
      onRefresh();
      onRefreshStorefront();
    } else {
      pushNotice('error', 'Failed to delete category.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-bold text-[#141413]">Store Categories</h1>
          <p className="text-xs text-[#63615C]">Organize women&apos;s ethnic &amp; couture collections</p>
        </div>
        <button
          type="button"
          onClick={() => openModal()}
          className="px-4 py-2.5 bg-[#164E3F] hover:bg-[#0F3A2E] text-white text-xs font-semibold uppercase tracking-wider rounded-md flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add Category</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map((cat) => (
          <div key={cat.id} className="bg-white rounded-lg border border-[#E2DFD7] overflow-hidden flex flex-col">
            <img src={cat.image} alt={cat.name} className="w-full h-36 object-cover bg-[#F7F6F2]" />
            <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#141413]">{cat.name}</h3>
                <p className="text-xs text-[#63615C] mt-1 line-clamp-2">{cat.description}</p>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-[#E2DFD7]">
                <span className="font-mono text-[11px] text-[#164E3F] font-semibold">
                  {cat.productCount ?? 0} styles
                </span>
                {confirmDeleteId === cat.id ? (
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleDelete(cat)}
                      className="px-2 py-1 bg-[#B91C1C] text-white text-[11px] rounded font-semibold cursor-pointer"
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="px-2 py-1 border border-[#E2DFD7] text-[11px] rounded cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => openModal(cat)}
                      className="px-2.5 py-1 border border-[#E2DFD7] rounded text-[11px] font-semibold hover:border-[#164E3F] cursor-pointer flex items-center gap-1"
                    >
                      <Edit className="w-3 h-3" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(cat.id)}
                      className="p-1 border border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C] rounded cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs p-4 flex items-center justify-center">
          <div className="bg-white rounded-xl border border-[#E2DFD7] max-w-md w-full p-6 space-y-4 text-xs shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#E2DFD7] pb-3">
              <h3 className="font-serif text-lg font-bold flex items-center gap-2">
                <Package className="w-4 h-4 text-[#164E3F]" />
                {editing ? 'Edit Category' : 'New Category'}
              </h3>
              <button type="button" onClick={() => setModalOpen(false)} className="cursor-pointer">
                <X className="w-5 h-5 text-[#63615C]" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="font-semibold block mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-2.5 border border-[#E2DFD7] rounded bg-[#F7F6F2]"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-2.5 border border-[#E2DFD7] rounded bg-[#F7F6F2]"
                />
              </div>
              <div>
                <label className="font-semibold block mb-1">Cover Image URL</label>
                <input
                  type="text"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  className="w-full p-2.5 border border-[#E2DFD7] rounded bg-[#F7F6F2] font-mono"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 border border-[#E2DFD7] rounded font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-[#164E3F] text-white rounded font-semibold cursor-pointer"
                >
                  {saving ? 'Saving...' : 'Save Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
