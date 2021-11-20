setTimeout(function() {
        var minder = new kityminder.Minder({
            renderTo: '.mindmap'
        });
        var markdownText = $('.mindmap').text().trim();
        if(!markdownText) {
            return;
        }
        $('.mindmap p').each(function(index, element) {
            element.style.display = 'none';
        });
        minder.importData('markdown', markdownText);
        minder.disable();
        minder.execCommand('hand');
    },
    3000
)
