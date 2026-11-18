import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowLeft,
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiTag,
  FiCheck,
  FiX,
  FiSearch,
  FiList,
} from 'react-icons/fi';
import api from '../utils/taskManager.api';
import { toast } from 'react-hot-toast';

const PredefinedTitles = () => {
  const navigate = useNavigate();
  const [titles, setTitles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Title Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingDoc, setEditingDoc] = useState(null);
  const [titleInput, setTitleInput] = useState('');
  const [subtitles, setSubtitles] = useState([]);
  const [newSubtitleInput, setNewSubtitleInput] = useState('');
  const [newSubtitleAmount, setNewSubtitleAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchTitles();
  }, []);

  const fetchTitles = async () => {
    try {
      setLoading(true);
      const res = await api.get('/admin/predefined-titles');
      setTitles(res.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to fetch predefined titles');
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingDoc(null);
    setTitleInput('');
    setSubtitles([]);
    setNewSubtitleInput('');
    setNewSubtitleAmount('');
    setModalOpen(true);
  };

  const openEditModal = (doc) => {
    setEditingDoc(doc);
    setTitleInput(doc.title || '');
    const cleanSubs = (doc.subtitles || []).map((s) => {
      if (typeof s === 'string') return { name: s, amount: 0 };
      return { name: s?.name || '', amount: Number(s?.amount) || 0 };
    });
    setSubtitles(cleanSubs);
    setNewSubtitleInput('');
    setNewSubtitleAmount('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingDoc(null);
    setTitleInput('');
    setSubtitles([]);
    setNewSubtitleInput('');
    setNewSubtitleAmount('');
  };

  const handleAddSubtitle = (e) => {
    if (e) e.preventDefault();
    const val = newSubtitleInput.trim();
    if (!val) return;
    const amt = parseFloat(newSubtitleAmount) || 0;
    const existingIndex = subtitles.findIndex(
      (s) => (typeof s === 'string' ? s : s?.name)?.toLowerCase() === val.toLowerCase()
    );
    if (existingIndex >= 0) {
      const updated = [...subtitles];
      updated[existingIndex] = { name: val, amount: amt >= 0 ? amt : 0 };
      setSubtitles(updated);
      setNewSubtitleInput('');
      setNewSubtitleAmount('');
      toast.success(`Updated amount for "${val}" to ₹${amt}`);
      return;
    }
    setSubtitles([...subtitles, { name: val, amount: amt >= 0 ? amt : 0 }]);
    setNewSubtitleInput('');
    setNewSubtitleAmount('');
  };

  const handleRemoveSubtitle = (indexToRemove) => {
    setSubtitles(subtitles.filter((_, i) => i !== indexToRemove));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const cleanTitle = titleInput.trim();
    if (!cleanTitle) {
      toast.error('Please enter a title');
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        title: cleanTitle,
        subtitles,
      };

      if (editingDoc) {
        await api.put(`/admin/predefined-titles/${editingDoc._id}`, payload);
        toast.success('Predefined title updated');
      } else {
        await api.post('/admin/predefined-titles', payload);
        toast.success('Predefined title created');
      }
      closeModal();
      fetchTitles();
    } catch (err) {
      toast.error(err.response?.data?.message || err.message || 'Operation failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Are you sure you want to delete "${doc.title}"?`)) {
      return;
    }

    try {
      await api.delete(`/admin/predefined-titles/${doc._id}`);
      toast.success('Deleted successfully');
      fetchTitles();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete');
    }
  };

  const filteredTitles = titles.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const matchesTitle = t.title?.toLowerCase().includes(q);
    const matchesSub = t.subtitles?.some((s) => s.toLowerCase().includes(q));
    return matchesTitle || matchesSub;
  });

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/taskflow/admin/dashboard')}
              className="p-2 bg-white text-gray-600 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors shadow-sm"
              title="Back to Admin Dashboard"
            >
              <FiArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
                <FiTag className="text-primary-600" /> Task Titles & Sub-titles
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Preconfigure standard task titles and linked sub-titles for your teams
              </p>
            </div>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
          >
            <FiPlus className="w-5 h-5" />
            Add New Title
          </button>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="relative">
            <FiSearch className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search titles or sub-titles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
            />
          </div>
        </div>

        {/* Titles List */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredTitles.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <FiList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-gray-900">
              {search ? 'No matching titles found' : 'No predefined titles yet'}
            </h3>
            <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
              {search
                ? 'Try a different search query.'
                : 'Click "Add New Title" to create your first standard task title and its sub-titles.'}
            </p>
            {!search && (
              <button
                onClick={openCreateModal}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
              >
                <FiPlus className="w-4 h-4" /> Add Title
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTitles.map((item) => (
              <div
                key={item._id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:border-primary-300 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="text-lg font-bold text-gray-900">{item.title}</h3>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => openEditModal(item)}
                        className="p-1.5 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                        title="Edit title & sub-titles"
                      >
                        <FiEdit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
                        className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete title"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Sub-titles */}
                  <div className="mt-3">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-1.5">
                      Sub-titles ({item.subtitles?.length || 0})
                    </span>
                    {item.subtitles && item.subtitles.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {item.subtitles.map((sub, sIdx) => {
                          const name = typeof sub === 'string' ? sub : sub?.name;
                          const amount = typeof sub === 'object' ? sub?.amount : 0;
                          return (
                            <span
                              key={sIdx}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200"
                            >
                              <span>{name}</span>
                              {amount > 0 && (
                                <span className="font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded text-[11px] border border-emerald-200">
                                  ₹{amount.toLocaleString()}
                                </span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 italic">No sub-titles defined (any or none)</p>
                    )}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
                  <span>Created {new Date(item.createdAt).toLocaleDateString()}</span>
                  {item.createdBy?.name && <span>By {item.createdBy.name}</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create/Edit Title Modal */}
        {modalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6 animate-scale-up">
              <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">
                  {editingDoc ? 'Edit Predefined Title' : 'New Predefined Title'}
                </h3>
                <button
                  type="button"
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSave} className="space-y-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={titleInput}
                    onChange={(e) => setTitleInput(e.target.value)}
                    placeholder="e.g. GST Return Filing, Income Tax Audit"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Linked Sub-titles (Optional)
                  </label>
                  <p className="text-xs text-gray-500 mb-2">
                    Add sub-categories or variations specific to this title (e.g. GSTR-1, GSTR-3B).
                  </p>

                  <div className="flex flex-col sm:flex-row gap-2 mb-2">
                    <input
                      type="text"
                      value={newSubtitleInput}
                      onChange={(e) => setNewSubtitleInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSubtitle();
                        }
                      }}
                      placeholder="Sub-title name (e.g. GSTR-1, Audit)..."
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                    />
                    <div className="relative w-full sm:w-36">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-semibold">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={newSubtitleAmount}
                        onChange={(e) => setNewSubtitleAmount(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddSubtitle();
                          }
                        }}
                        placeholder="Amount"
                        className="w-full pl-6 pr-2 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleAddSubtitle}
                      className="px-4 py-1.5 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
                    >
                      + Add
                    </button>
                  </div>

                  {subtitles.length > 0 && (
                    <div className="space-y-2 max-h-48 overflow-y-auto p-2 border border-gray-200 rounded-lg bg-gray-50">
                      {subtitles.map((sub, i) => {
                        const name = typeof sub === 'string' ? sub : sub?.name;
                        const amount = typeof sub === 'object' ? sub?.amount : 0;
                        return (
                          <div
                            key={i}
                            className="flex items-center justify-between gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm"
                          >
                            <span className="text-sm font-medium text-gray-800 truncate">{name}</span>
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="relative w-28">
                                <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-semibold">₹</span>
                                <input
                                  type="number"
                                  min="0"
                                  value={amount || ''}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setSubtitles(
                                      subtitles.map((s, idx) =>
                                        idx === i ? { name, amount: val === '' ? 0 : Math.max(0, parseFloat(val) || 0) } : s
                                      )
                                    );
                                  }}
                                  placeholder="0"
                                  className="w-full pl-5 pr-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary-500"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => handleRemoveSubtitle(i)}
                                className="text-gray-400 hover:text-red-500 p-1 rounded transition-colors"
                                title="Remove sub-title"
                              >
                                <FiX className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-5 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                  >
                    <FiCheck className="w-4 h-4" />
                    {isSubmitting ? 'Saving...' : editingDoc ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PredefinedTitles;
