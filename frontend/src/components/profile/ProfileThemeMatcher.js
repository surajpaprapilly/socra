import { CONFLICTS } from '../../data/conflicts';

// Simple heuristic to match legacy sessions to their parent Theme
export function getConflictInfoFromQuestion(questionStr) {
    if (!questionStr) return { theme: "General", themeId: "general", conflictTitle: "Custom Inquiry" };

    const lowerQ = questionStr.toLowerCase().trim();

    for (const conflict of CONFLICTS) {
        // Direct match with known exam questions
        if (conflict.examQuestions) {
            for (const eq of conflict.examQuestions) {
                if (lowerQ.includes(eq.toLowerCase().trim()) || lowerQ === eq.toLowerCase().trim()) {
                    return {
                        theme: formatThemeId(conflict.themeId),
                        themeId: conflict.themeId,
                        conflictTitle: conflict.title
                    };
                }
            }
        }
    }

    // Fallback heuristic keyword matching if standard questions weren't matched
    if (lowerQ.includes('technology') || lowerQ.includes('ai ') || lowerQ.includes('artificial intelligence') || lowerQ.includes('privacy')) {
        return { theme: 'Technology & Humanity', themeId: 'technology-humanity', conflictTitle: 'Custom Technology Inquiry' };
    }
    if (lowerQ.includes('media') || lowerQ.includes('social media') || lowerQ.includes('journalism') || lowerQ.includes('censorship')) {
        return { theme: 'Media & Information', themeId: 'media-information', conflictTitle: 'Custom Media Inquiry' };
    }
    if (lowerQ.includes('democracy') || lowerQ.includes('justice') || lowerQ.includes('prison') || lowerQ.includes('punishment')) {
        return { theme: 'Justice & Power', themeId: 'justice-power', conflictTitle: 'Custom Justice Inquiry' };
    }
    if (lowerQ.includes('environment') || lowerQ.includes('climate change') || lowerQ.includes('conservation')) {
        return { theme: 'Environment & Progress', themeId: 'environment-progress', conflictTitle: 'Custom Environmental Inquiry' };
    }
    if (lowerQ.includes('science') || lowerQ.includes('research') || lowerQ.includes('ethics') || lowerQ.includes('genetic')) {
        return { theme: 'Science & Ethics', themeId: 'science-ethics', conflictTitle: 'Custom Science Inquiry' };
    }
    if (lowerQ.includes('globalisation') || lowerQ.includes('inequality') || lowerQ.includes('meritocracy') || lowerQ.includes('poverty')) {
        return { theme: 'Globalisation & Society', themeId: 'globalisation-society', conflictTitle: 'Custom Globalisation Inquiry' };
    }

    return { theme: "General Paper", themeId: "general", conflictTitle: "Independent Inquiry" };
}

function formatThemeId(id) {
    const map = {
        'technology-humanity': 'Technology & Humanity',
        'media-information': 'Media & Information',
        'justice-power': 'Justice & Power',
        'environment-progress': 'Environment & Progress',
        'science-ethics': 'Science & Ethics',
        'globalisation-society': 'Globalisation & Society'
    };
    return map[id] || id;
}
