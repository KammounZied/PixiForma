import { useId } from 'react';
import { IAtomAvatar } from '@/interfaces';

const GRADIENTS = [
    { from: '#504BCF', to: '#A9A7ED' },
    { from: '#e0004d', to: '#E0A449' },
    { from: '#49A4E0', to: '#23B432' },
    { from: '#E0A449', to: '#e0004d' },
    { from: '#6763DD', to: '#7E7BE5' },
    { from: '#e0004d', to: '#49A4E0' },
    { from: '#23B432', to: '#49A4E0' },
    { from: '#E0A449', to: '#504BCF' },
];

const getInitial = (name?: string): string => {
    const clean = (name || '').trim();
    if (!clean) return '?';
    return clean.charAt(0).toUpperCase();
};

const getGradient = (name?: string) => {
    const clean = (name || '').trim();
    let hash = 0;
    for (let i = 0; i < clean.length; i++) {
        hash = (hash * 31 + clean.charCodeAt(i)) >>> 0;
    }
    return GRADIENTS[hash % GRADIENTS.length];
};

const AtomAvatar = ({ name, size = 36, className }: IAtomAvatar) => {
    const gid = useId();
    const gradient = getGradient(name);
    const letter = getInitial(name);
    const fontSize = 20;

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 40 40"
            className={className}
            aria-hidden="true"
            role="img"
            style={{ borderRadius: '50%', flexShrink: 0 }}
        >
            <defs>
                <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={gradient.from} />
                    <stop offset="100%" stopColor={gradient.to} />
                </linearGradient>
            </defs>
            <circle cx="20" cy="20" r="20" fill={`url(#${gid})`} />
            <text
                x="20"
                y="21"
                textAnchor="middle"
                dominantBaseline="central"
                fill="#FFFFFF"
                fontSize={fontSize}
                fontWeight="700"
                fontFamily="Lato, sans-serif"
            >
                {letter}
            </text>
        </svg>
    );
};

export default AtomAvatar;
