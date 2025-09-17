/**
 * Updates relative time displays dynamically in the browser
 */
function updateRelativeTime() {
    const elements = document.querySelectorAll('.relative-time[data-played-at]');
    
    elements.forEach(element => {
        const playedAt = new Date(element.dataset.playedAt);
        const now = new Date();
        const diffMs = now - playedAt;
        
        // Convert to minutes and hours
        const minutes = Math.floor(diffMs / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        let relativeText;
        
        if (days >= 1) {
            // Show date format for anything older than 24 hours
            relativeText = playedAt.toLocaleDateString('en-GB', { 
                day: 'numeric', 
                month: 'short' 
            });
        } else if (hours >= 1) {
            relativeText = `${hours}h ago`;
        } else if (minutes >= 1) {
            relativeText = `${minutes}m ago`;
        } else {
            relativeText = 'just now';
        }
        
        element.textContent = relativeText;
    });
}

// Update on page load
document.addEventListener('DOMContentLoaded', updateRelativeTime);

// Update every minute to keep timestamps fresh
setInterval(updateRelativeTime, 60000);