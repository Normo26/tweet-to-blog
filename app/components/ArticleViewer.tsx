'use client';

import { FileText, Globe, Globe2, Copy, Download, Printer } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { useState } from 'react';
import { useToast } from './ToastProvider';

interface ArticleViewerProps {
  articleEnglish: string | null;
  articleFrench: string | null;
  publishedEnglish: boolean;
  publishedFrench: boolean;
  publishedEnglishAt: string | null;
  publishedFrenchAt: string | null;
}

function renderArticle(content: string | null) {
  if (!content) return null;

  try {
    // Try to parse as JSON first
    if (typeof content === 'string' && content.trim().startsWith('{')) {
      const parsed = JSON.parse(content);
      return (
        <>
          <h2 className="text-xl font-bold mb-4">{parsed.title || 'Article'}</h2>
          <div dangerouslySetInnerHTML={{ __html: parsed.article || parsed.content || '' }} />
        </>
      );
    }
    // Otherwise render as markdown
    return <ReactMarkdown>{content}</ReactMarkdown>;
  } catch {
    // If parsing fails, render as markdown
    return <ReactMarkdown>{content}</ReactMarkdown>;
  }
}

export default function ArticleViewer({
  articleEnglish,
  articleFrench,
  publishedEnglish,
  publishedFrench,
  publishedEnglishAt,
  publishedFrenchAt,
}: ArticleViewerProps) {
  const toast = useToast();

  const copyToClipboard = (text: string, language: string) => {
    navigator.clipboard.writeText(text);
    toast.showSuccess(`${language} article copied to clipboard!`);
  };

  const exportAsMarkdown = (content: string, language: string) => {
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `article-${language}-${new Date().toISOString().split('T')[0]}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.showSuccess(`${language} article exported as Markdown!`);
  };

  const exportAsHTML = (content: string, language: string) => {
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Article - ${language}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
    h1, h2, h3 { margin-top: 1.5em; }
    p { margin: 1em 0; }
  </style>
</head>
<body>
  ${typeof content === 'string' && content.trim().startsWith('{') 
    ? JSON.parse(content).article || JSON.parse(content).content || content
    : content}
</body>
</html>`;
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `article-${language}-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.showSuccess(`${language} article exported as HTML!`);
  };

  const printArticle = (content: string) => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Print Article</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; }
    h1, h2, h3 { margin-top: 1.5em; }
    p { margin: 1em 0; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  ${typeof content === 'string' && content.trim().startsWith('{') 
    ? JSON.parse(content).article || JSON.parse(content).content || content
    : content}
</body>
</html>`;
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  const getPlainText = (content: string | null): string => {
    if (!content) return '';
    try {
      if (typeof content === 'string' && content.trim().startsWith('{')) {
        const parsed = JSON.parse(content);
        return parsed.article || parsed.content || parsed.title || '';
      }
      return content;
    } catch {
      return content;
    }
  };

  return (
    <div className="space-y-6">
      {/* English Article */}
      {articleEnglish && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">English Article</h3>
            </div>
            <div className="flex items-center gap-2">
              {publishedEnglish && (
                <span className="text-xs bg-green-100 text-green-800 px-3 py-1 rounded-full">
                  Published {publishedEnglishAt ? new Date(publishedEnglishAt).toLocaleDateString() : ''}
                </span>
              )}
              <div className="flex items-center gap-1 border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => copyToClipboard(getPlainText(articleEnglish), 'English')}
                  className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1"
                  title="Copy article"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  onClick={() => exportAsMarkdown(getPlainText(articleEnglish), 'English')}
                  className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1 border-l border-gray-200"
                  title="Export as Markdown"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={() => exportAsHTML(articleEnglish, 'English')}
                  className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1 border-l border-gray-200"
                  title="Export as HTML"
                >
                  <FileText className="h-4 w-4" />
                </button>
                <button
                  onClick={() => printArticle(articleEnglish)}
                  className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1 border-l border-gray-200"
                  title="Print article"
                >
                  <Printer className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          <div className="prose prose-sm max-w-none">
            {renderArticle(articleEnglish)}
          </div>
        </div>
      )}

      {/* French Article */}
      {articleFrench && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Globe2 className="h-5 w-5 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900">French Article</h3>
            </div>
            <div className="flex items-center gap-2">
              {publishedFrench && (
                <span className="text-xs bg-green-100 text-green-800 px-3 py-1 rounded-full">
                  Published {publishedFrenchAt ? new Date(publishedFrenchAt).toLocaleDateString() : ''}
                </span>
              )}
              <div className="flex items-center gap-1 border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => copyToClipboard(getPlainText(articleFrench), 'French')}
                  className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1"
                  title="Copy article"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  onClick={() => exportAsMarkdown(getPlainText(articleFrench), 'French')}
                  className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1 border-l border-gray-200"
                  title="Export as Markdown"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={() => exportAsHTML(articleFrench, 'French')}
                  className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1 border-l border-gray-200"
                  title="Export as HTML"
                >
                  <FileText className="h-4 w-4" />
                </button>
                <button
                  onClick={() => printArticle(articleFrench)}
                  className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-1 border-l border-gray-200"
                  title="Print article"
                >
                  <Printer className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          <div className="prose prose-sm max-w-none">
            {renderArticle(articleFrench)}
          </div>
        </div>
      )}

      {!articleEnglish && !articleFrench && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-12 text-center">
          <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No articles generated yet</p>
        </div>
      )}
    </div>
  );
}
