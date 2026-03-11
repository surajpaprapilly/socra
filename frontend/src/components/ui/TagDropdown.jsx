import { useState, useRef, useEffect } from 'react';

const TAG_OPTIONS = [
    { value: 'Key Argument', icon: '✦', label: 'Key Argument' },
    { value: 'Surprising Fact', icon: '◈', label: 'Surprising Fact' },
    { value: 'Use in Essay', icon: '⚡', label: 'Use in Essay' },
    { value: 'Still Confused', icon: '?', label: 'Still Confused' }
];

export default function TagDropdown({ value, onChange, onInteract, disabled }) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    const selectedOption = TAG_OPTIONS.find(opt => opt.value === value) || TAG_OPTIONS[0];

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const handleSelect = (val) => {
        if (onInteract) onInteract();
        onChange(val);
        setIsOpen(false);
    };

    const toggleOpen = () => {
        if (disabled) return;
        if (onInteract) onInteract();
        setIsOpen(!isOpen);
    };

    return (
        <div className="relative inline-block text-left" ref={dropdownRef}>
            <button
                type="button"
                onClick={toggleOpen}
                disabled={disabled}
                className={`flex items-center space-x-2 font-mono text-xs uppercase tracking-widest focus:outline-none bg-transparent transition-colors ${disabled ? 'text-textMuted cursor-default' : 'text-amber hover:text-amber/80 cursor-pointer'
                    }`}
            >
                <span>{selectedOption.icon} {selectedOption.label}</span>
                {!disabled && <span className="text-[10px] ml-1 opacity-70">▾</span>}
            </button>

            {isOpen && !disabled && (
                <div className="absolute z-20 mt-2 w-48 origin-top-left bg-[#1A1814] border border-[#2A2825] shadow-lg animate-in fade-in zoom-in-95 duration-200">
                    <div className="py-1">
                        {TAG_OPTIONS.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => handleSelect(option.value)}
                                className={`
                                    w-full text-left px-4 py-2 text-xs font-mono uppercase tracking-widest
                                    hover:bg-[#2A2825] transition-colors
                                    ${value === option.value ? 'text-amber' : 'text-textMuted'}
                                `}
                            >
                                <span className="inline-block w-4 text-center mr-2">{option.icon}</span>
                                {option.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
