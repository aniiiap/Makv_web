import { useState, useRef, useEffect } from 'react';
import { FiChevronDown, FiSearch, FiCheck, FiX } from 'react-icons/fi';

/**
 * PredefinedTitleSelect
 * 
 * Provides a clean searchable dropdown of predefined titles.
 * Also provides a searchable dropdown of linked sub-titles for the selected title.
 * Displays amount badge for each subtitle if defined, and automatically passes
 * the subtitle's amount when selected.
 */
const PredefinedTitleSelect = ({
  predefinedTitles = [],
  titleValue = '',
  subtitleValue = '',
  onTitleChange,
  onSubtitleChange,
  disabled = false,
  isDark = false,
  isGlobalAdmin = false,
}) => {
  const [isTitleOpen, setIsTitleOpen] = useState(false);
  const [titleSearch, setTitleSearch] = useState('');
  const [isCustomTitle, setIsCustomTitle] = useState(false);

  const [isSubtitleOpen, setIsSubtitleOpen] = useState(false);
  const [subtitleSearch, setSubtitleSearch] = useState('');
  const [isCustomSubtitle, setIsCustomSubtitle] = useState(false);

  const titleRef = useRef(null);
  const subtitleRef = useRef(null);

  // Sync custom title mode
  useEffect(() => {
    if (!titleValue) return;
    if (!isGlobalAdmin) {
      setIsCustomTitle(false);
      return;
    }
    const matched = predefinedTitles.some(
      (t) => t.title?.toLowerCase() === titleValue.toLowerCase()
    );
    if (!matched && titleValue.trim() !== '') {
      setIsCustomTitle(true);
    }
  }, [titleValue, predefinedTitles, isGlobalAdmin]);

  // Find currently selected predefined title object to get linked subtitles
  const matchedTitleObj = predefinedTitles.find(
    (t) => t.title?.toLowerCase() === titleValue?.toLowerCase()
  );
  const linkedSubtitles = (matchedTitleObj?.subtitles || []).map((s) => {
    if (typeof s === 'string') return { name: s, amount: 0 };
    return { name: s?.name || '', amount: Number(s?.amount) || 0 };
  });

  // Sync custom subtitle mode
  useEffect(() => {
    if (!subtitleValue) return;
    if (!isGlobalAdmin) {
      setIsCustomSubtitle(false);
      return;
    }
    const matched = linkedSubtitles.some(
      (s) => s.name?.toLowerCase() === subtitleValue.toLowerCase()
    );
    if (!matched && subtitleValue.trim() !== '') {
      setIsCustomSubtitle(true);
    }
  }, [subtitleValue, linkedSubtitles, isGlobalAdmin]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (titleRef.current && !titleRef.current.contains(e.target)) {
        setIsTitleOpen(false);
      }
      if (subtitleRef.current && !subtitleRef.current.contains(e.target)) {
        setIsSubtitleOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Filtered titles
  const filteredTitles = predefinedTitles.filter((t) =>
    t.title?.toLowerCase().includes(titleSearch.toLowerCase())
  );

  // Filtered subtitles
  const filteredSubtitles = linkedSubtitles.filter((s) =>
    s.name?.toLowerCase().includes(subtitleSearch.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Title Field */}
      <div>
        <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          Title *
        </label>

        {isCustomTitle && isGlobalAdmin ? (
          <div className="relative">
            <input
              type="text"
              autoFocus
              required
              disabled={disabled}
              value={titleValue}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Enter custom task title"
              className={`w-full px-3 py-2 pr-28 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm ${
                isDark
                  ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400'
                  : 'border-gray-300 bg-white text-gray-900'
              } disabled:cursor-not-allowed disabled:opacity-60`}
            />
            {!disabled && (
              <button
                type="button"
                onClick={() => {
                  setIsCustomTitle(false);
                  onTitleChange('');
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-primary-600 hover:text-primary-700 font-medium px-2 py-1 rounded hover:bg-primary-50 dark:hover:bg-gray-600"
              >
                Use Predefined
              </button>
            )}
          </div>
        ) : (
          <div className="relative" ref={titleRef}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => setIsTitleOpen(!isTitleOpen)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-left flex items-center justify-between text-sm ${
                isDark
                  ? 'border-gray-600 bg-gray-700 text-white'
                  : 'border-gray-300 bg-white text-gray-900'
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <span className={titleValue ? '' : 'text-gray-400'}>
                {titleValue || '-- Select Standard Title --'}
              </span>
              <FiChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isTitleOpen ? 'rotate-180' : ''}`} />
            </button>

            {isTitleOpen && !disabled && (
              <div
                className={`absolute z-30 left-0 right-0 mt-1 border rounded-lg shadow-lg overflow-hidden ${
                  isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                }`}
              >
                <div className={`p-2 border-b ${isDark ? 'border-gray-700 bg-gray-800/80' : 'border-gray-100 bg-gray-50'}`}>
                  <div className="relative">
                    <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="text"
                      autoFocus
                      value={titleSearch}
                      onChange={(e) => setTitleSearch(e.target.value)}
                      placeholder="Search title..."
                      className={`w-full pl-8 pr-7 py-1.5 text-xs rounded border ${
                        isDark ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900'
                      } focus:outline-none focus:ring-1 focus:ring-primary-500`}
                    />
                    {titleSearch && (
                      <button
                        type="button"
                        onClick={() => setTitleSearch('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        <FiX className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="max-h-52 overflow-y-auto py-1">
                  {filteredTitles.length === 0 ? (
                    <div className="px-3 py-2 text-xs text-gray-400 text-center">
                      No matching title found
                    </div>
                  ) : (
                    filteredTitles.map((item) => {
                      const isSelected = item.title === titleValue;
                      return (
                        <button
                          key={item._id}
                          type="button"
                          onClick={() => {
                            onTitleChange(item.title);
                            onSubtitleChange('', 0);
                            setIsCustomSubtitle(false);
                            setIsTitleOpen(false);
                            setTitleSearch('');
                          }}
                          className={`w-full px-3 py-2 text-left text-xs sm:text-sm flex items-center justify-between transition-colors ${
                            isSelected
                              ? 'bg-primary-50 text-primary-700 font-semibold'
                              : isDark
                              ? 'hover:bg-gray-700 text-gray-200'
                              : 'hover:bg-gray-50 text-gray-800'
                          }`}
                        >
                          <span className="truncate">{item.title}</span>
                          {isSelected && <FiCheck className="w-4 h-4 text-primary-600" />}
                        </button>
                      );
                    })
                  )}

                  {isGlobalAdmin && (
                    <div className={`border-t mt-1 pt-1 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomTitle(true);
                          setIsTitleOpen(false);
                          setTitleSearch('');
                        }}
                        className="w-full px-3 py-2 text-left text-xs font-semibold text-primary-600 hover:bg-primary-50 dark:hover:bg-gray-700 flex items-center gap-1.5"
                      >
                        + Other (Write custom)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sub-title Field */}
      <div>
        <label className={`block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          Sub-title *
        </label>

        {isCustomSubtitle && isGlobalAdmin ? (
          <div className="relative">
            <input
              type="text"
              autoFocus
              required
              disabled={disabled}
              value={subtitleValue}
              onChange={(e) => onSubtitleChange(e.target.value)}
              placeholder="Enter custom sub-title"
              className={`w-full px-3 py-2 pr-28 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm ${
                isDark
                  ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400'
                  : 'border-gray-300 bg-white text-gray-900'
              } disabled:cursor-not-allowed disabled:opacity-60`}
            />
            {!disabled && (
              <button
                type="button"
                onClick={() => {
                  setIsCustomSubtitle(false);
                  onSubtitleChange('', 0);
                }}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-primary-600 hover:text-primary-700 font-medium px-2 py-1 rounded hover:bg-primary-50 dark:hover:bg-gray-600"
              >
                Select from list
              </button>
            )}
          </div>
        ) : (
          <div className="relative" ref={subtitleRef}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => setIsSubtitleOpen(!isSubtitleOpen)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-left flex items-center justify-between text-sm ${
                isDark
                  ? 'border-gray-600 bg-gray-700 text-white'
                  : 'border-gray-300 bg-white text-gray-900'
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              <span className={subtitleValue ? '' : 'text-gray-400'}>
                {subtitleValue || (linkedSubtitles.length > 0 ? '-- Select Sub-title --' : '-- No standard sub-titles --')}
              </span>
              <FiChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isSubtitleOpen ? 'rotate-180' : ''}`} />
            </button>

            {isSubtitleOpen && !disabled && (
              <div
                className={`absolute z-30 left-0 right-0 mt-1 border rounded-lg shadow-lg overflow-hidden ${
                  isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
                }`}
              >
                {linkedSubtitles.length > 0 && (
                  <div className={`p-2 border-b ${isDark ? 'border-gray-700 bg-gray-800/80' : 'border-gray-100 bg-gray-50'}`}>
                    <div className="relative">
                      <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <input
                        type="text"
                        autoFocus
                        value={subtitleSearch}
                        onChange={(e) => setSubtitleSearch(e.target.value)}
                        placeholder="Search sub-title..."
                        className={`w-full pl-8 pr-7 py-1.5 text-xs rounded border ${
                          isDark ? 'border-gray-600 bg-gray-700 text-white placeholder-gray-400' : 'border-gray-300 bg-white text-gray-900'
                        } focus:outline-none focus:ring-1 focus:ring-primary-500`}
                      />
                      {subtitleSearch && (
                        <button
                          type="button"
                          onClick={() => setSubtitleSearch('')}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <FiX className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                )}

                <div className="max-h-52 overflow-y-auto py-1">
                  <button
                    type="button"
                    onClick={() => {
                      onSubtitleChange('', 0);
                      setIsSubtitleOpen(false);
                      setSubtitleSearch('');
                    }}
                    className={`w-full px-3 py-2 text-left text-xs italic flex items-center justify-between ${
                      isDark ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-400 hover:bg-gray-50'
                    }`}
                  >
                    <span>-- None --</span>
                    {!subtitleValue && <FiCheck className="w-3.5 h-3.5 text-gray-400" />}
                  </button>

                  {filteredSubtitles.map((subObj, idx) => {
                    const isSelected = subObj.name === subtitleValue;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          onSubtitleChange(subObj.name, subObj.amount);
                          setIsSubtitleOpen(false);
                          setSubtitleSearch('');
                        }}
                        className={`w-full px-3 py-2 text-left text-xs sm:text-sm flex items-center justify-between transition-colors ${
                          isSelected
                            ? 'bg-primary-50 text-primary-700 font-semibold dark:bg-primary-950/40'
                            : isDark
                            ? 'hover:bg-gray-700 text-gray-200'
                            : 'hover:bg-gray-50 text-gray-800'
                        }`}
                      >
                        <span className="truncate">{subObj.name}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          {isSelected && <FiCheck className="w-4 h-4 text-primary-600" />}
                        </div>
                      </button>
                    );
                  })}

                  {isGlobalAdmin && (
                    <div className={`border-t mt-1 pt-1 ${isDark ? 'border-gray-700' : 'border-gray-100'}`}>
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomSubtitle(true);
                          setIsSubtitleOpen(false);
                          setSubtitleSearch('');
                        }}
                        className="w-full px-3 py-2 text-left text-xs font-semibold text-primary-600 hover:bg-primary-50 dark:hover:bg-gray-700 flex items-center gap-1.5"
                      >
                        + Other (Write custom)
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PredefinedTitleSelect;
