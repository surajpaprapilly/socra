const InsightTag = ({ insight }) => {
    if (!insight) return null;
    return (
        <div className="inline-flex items-center px-3 py-1 bg-sage/10 border border-sage/30 text-sage text-sm font-serif rounded-none animate-slide-in">
            <span className="mr-2 opacity-70">❖</span>
            {insight}
        </div>
    );
};

export default InsightTag;
