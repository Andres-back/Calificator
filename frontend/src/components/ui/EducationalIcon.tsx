import type { HTMLAttributes, SyntheticEvent } from 'react';
import { cn } from '@/lib/cn';

export type EducationalIconName =
  | 'dashboard'
  | 'subjects'
  | 'resources'
  | 'presentations'
  | 'reports'
  | 'xali'
  | 'ai-settings'
  | 'crossword'
  | 'word-search'
  | 'matching'
  | 'exam'
  | 'learning-guide'
  | 'workshop'
  | 'story'
  | 'coloring'
  | 'rubric'
  | 'reinforcement'
  | 'quick-quiz'
  | 'reading'
  | 'concept-map'
  | 'flashcards'
  | 'prepare-evaluation'
  | 'pending-reviews'
  | 'student-claim'
  | 'grade-evidence'
  | 'attendance'
  | 'gradebook'
  | 'curriculum-dba'
  | 'subject-math'
  | 'subject-science'
  | 'subject-language'
  | 'subject-social'
  | 'subject-english'
  | 'subject-art'
  | 'subject-technology'
  | 'report-subjects'
  | 'report-grades'
  | 'report-average'
  | 'student-roster'
  | 'interactive-games'
  | 'archived-drafts'
  | 'pdf-ready'
  | 'presentation-processing'
  | 'presentation-ready'
  | 'presentation-error'
  | 'ai-institutional'
  | 'ai-own-key'
  | 'ai-routing';

type IconProps = Omit<HTMLAttributes<HTMLSpanElement>, 'children'> & { name: EducationalIconName };

const EDUCATIONAL_ICON_ASSET: Record<EducationalIconName, string> = {
  dashboard: 'dashboard',
  subjects: 'subjects',
  resources: 'resources',
  presentations: 'presentations',
  reports: 'reports',
  xali: 'xali',
  'ai-settings': 'ai-settings',
  crossword: 'crossword',
  'word-search': 'word-search',
  matching: 'matching',
  exam: 'workshop',
  'learning-guide': 'learning-guide',
  workshop: 'workshop',
  story: 'story',
  coloring: 'coloring',
  rubric: 'workshop',
  reinforcement: 'reinforcement',
  'quick-quiz': 'workshop',
  reading: 'reading',
  'concept-map': 'concept-map',
  flashcards: 'flashcards',
  'prepare-evaluation': 'prepare-evaluation',
  'pending-reviews': 'pending-reviews',
  'student-claim': 'student-claim',
  'grade-evidence': 'grade-evidence',
  attendance: 'attendance',
  gradebook: 'gradebook',
  'curriculum-dba': 'curriculum-dba',
  'subject-math': 'subject-math',
  'subject-science': 'subject-science',
  'subject-language': 'subject-language',
  'subject-social': 'subject-social',
  'subject-english': 'subject-english',
  'subject-art': 'subject-art',
  'subject-technology': 'subject-technology',
  'report-subjects': 'report-subjects',
  'report-grades': 'report-grades',
  'report-average': 'report-average',
  'student-roster': 'student-roster',
  'interactive-games': 'interactive-games',
  'archived-drafts': 'archived-drafts',
  'pdf-ready': 'pdf-ready',
  'presentation-processing': 'presentation-processing',
  'presentation-ready': 'presentation-ready',
  'presentation-error': 'presentation-error',
  'ai-institutional': 'ai-institutional',
  'ai-own-key': 'ai-own-key',
  'ai-routing': 'ai-routing',
};

const FALLBACK_ICON: Partial<Record<EducationalIconName, EducationalIconName>> = {
  'prepare-evaluation': 'exam',
  'pending-reviews': 'reading',
  'student-claim': 'workshop',
  'grade-evidence': 'exam',
  attendance: 'workshop',
  gradebook: 'learning-guide',
  'curriculum-dba': 'learning-guide',
  'subject-math': 'subjects',
  'subject-science': 'subjects',
  'subject-language': 'subjects',
  'subject-social': 'subjects',
  'subject-english': 'subjects',
  'subject-art': 'coloring',
  'subject-technology': 'ai-settings',
  'report-subjects': 'reports',
  'report-grades': 'reports',
  'report-average': 'reports',
  'student-roster': 'subjects',
  'interactive-games': 'matching',
  'archived-drafts': 'resources',
  'pdf-ready': 'learning-guide',
  'presentation-processing': 'presentations',
  'presentation-ready': 'presentations',
  'presentation-error': 'presentations',
  'ai-institutional': 'ai-settings',
  'ai-own-key': 'xali',
  'ai-routing': 'ai-settings',
};

function Glyph({ name }: { name: EducationalIconName }) {
  const fallbackName = FALLBACK_ICON[name];
  if (fallbackName) return <Glyph name={fallbackName} />;

  switch (name) {
    case 'dashboard':
      return <><rect x="3.5" y="3.5" width="7" height="7" rx="2" /><rect x="13.5" y="3.5" width="7" height="4.5" rx="2" /><rect x="13.5" y="11" width="7" height="9.5" rx="2" /><rect x="3.5" y="13" width="7" height="7.5" rx="2" /></>;
    case 'subjects':
      return <><path d="M3.5 5.5c3-1.2 5.5-.7 8.5 1.6v12c-3-2.2-5.5-2.8-8.5-1.6z" /><path d="M20.5 5.5c-3-1.2-5.5-.7-8.5 1.6v12c3-2.2 5.5-2.8 8.5-1.6z" /><path d="M12 7.1v12" /></>;
    case 'resources':
      return <><path d="M4 8.5h16v10.2a1.8 1.8 0 0 1-1.8 1.8H5.8A1.8 1.8 0 0 1 4 18.7z" /><path d="M8.5 8.5V6.8A2.3 2.3 0 0 1 10.8 4.5h2.4a2.3 2.3 0 0 1 2.3 2.3v1.7M4 12h16" /><path d="M10 12v2h4v-2" /></>;
    case 'presentations':
      return <><rect x="3" y="4" width="18" height="12" rx="2" /><path d="M8 20h8M12 16v4M7 12l3-3 2.2 2.2L15 8l2 2" /><circle cx="7" cy="8" r="1" /></>;
    case 'reports':
      return <><path d="M4 20V5M4 20h17" /><rect x="7" y="13" width="2.8" height="5" rx="1" /><rect x="12" y="9" width="2.8" height="9" rx="1" /><rect x="17" y="5" width="2.8" height="13" rx="1" /></>;
    case 'xali':
      return <><rect x="4.5" y="7" width="15" height="12" rx="5" /><path d="M12 7V4.5M9 22h6" /><circle cx="12" cy="3.5" r="1" /><circle cx="9" cy="12.5" r="1" fill="currentColor" /><circle cx="15" cy="12.5" r="1" fill="currentColor" /><path d="M9 16c1.8 1.2 4.2 1.2 6 0" /></>;
    case 'ai-settings':
      return <><path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h10M18 18h2" /><circle cx="15" cy="6" r="2" /><circle cx="9" cy="12" r="2" /><circle cx="16" cy="18" r="2" /></>;
    case 'crossword':
      return <><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M9 3v18M15 3v18M3 9h18M3 15h18" /><path d="M3 3h6v6H3zM15 3h6v6h-6zM9 9h6v6H9zM3 15h6v6H3zM15 15h6v6h-6z" fill="currentColor" opacity=".18" /></>;
    case 'word-search':
      return <><rect x="3" y="3" width="13" height="13" rx="3" /><path d="M7 6.5h1M11 6.5h1M7 10h1M11 10h1M7 13.5h1M11 13.5h1" /><circle cx="16.5" cy="16.5" r="3.5" /><path d="m19 19 2 2" /></>;
    case 'matching':
      return <><rect x="3" y="4" width="7" height="5" rx="2" /><rect x="14" y="15" width="7" height="5" rx="2" /><rect x="14" y="4" width="7" height="5" rx="2" /><rect x="3" y="15" width="7" height="5" rx="2" /><path d="M10 6.5h4M10 17.5h4M12 6.5l-1.5-1.5M12 6.5 10.5 8M12 17.5l1.5-1.5M12 17.5l1.5 1.5" /></>;
    case 'exam':
      return <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V2.8h6V4M8.5 9h7M8.5 13h4M8.5 17h3" /><path d="m14 16 1.5 1.5L19 14" /></>;
    case 'learning-guide':
      return <><path d="M4 5.5c2.7-1 5-.5 8 1.7v12c-3-2.2-5.3-2.7-8-1.7zM20 5.5c-2.7-1-5-.5-8 1.7v12c3-2.2 5.3-2.7 8-1.7z" /><path d="M7 9.5h2M15 9.5h2M7 13h2M15 13h2" /></>;
    case 'workshop':
      return <><rect x="4" y="4" width="13" height="16" rx="2" /><path d="M8 8h5M8 12h5M8 16h3" /><path d="m14 18 5.5-5.5 2 2L16 20l-3 .8z" /></>;
    case 'story':
      return <><path d="M3.5 6c3-1.3 5.5-.7 8.5 1.5v12c-3-2.1-5.5-2.7-8.5-1.4zM20.5 6c-3-1.3-5.5-.7-8.5 1.5v12c3-2.1 5.5-2.7 8.5-1.4z" /><path d="m12 4 .6 1.4L14 6l-1.4.6L12 8l-.6-1.4L10 6l1.4-.6z" /></>;
    case 'coloring':
      return <><path d="m5 18 9.8-9.8 3 3L8 21H5z" /><path d="m14.8 8.2 1.7-1.7a2.1 2.1 0 0 1 3 3l-1.7 1.7M5 18l3 3" /><path d="M4 7c2.5-3 5.5-3 8-1" /></>;
    case 'rubric':
      return <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M9 4v16M15 4v16" /><path d="m16.5 14 1.2 1.2 2-2.4" /></>;
    case 'reinforcement':
      return <><path d="M12 20S4 15.7 4 9.4A4.4 4.4 0 0 1 12 7a4.4 4.4 0 0 1 8 2.4C20 15.7 12 20 12 20z" /><path d="m8 13 2.2-2.2 2 2L16 9" /></>;
    case 'quick-quiz':
      return <><circle cx="12" cy="12" r="9" /><path d="M9.8 9a2.4 2.4 0 1 1 3.1 2.3c-.9.3-.9 1.1-.9 1.7M12 17h.01" /></>;
    case 'reading':
      return <><path d="M3.5 5.5c2.6-1 4.8-.5 7.5 1.5v11.5c-2.7-2-4.9-2.5-7.5-1.5zM18 5.6c-2.2-.6-4.3-.1-7 1.4v11.5c2-1.5 3.7-2.1 5.5-1.8" /><circle cx="18" cy="17" r="3" /><path d="m20.2 19.2 1.3 1.3" /></>;
    case 'concept-map':
      return <><rect x="8" y="3" width="8" height="5" rx="2" /><rect x="2.5" y="16" width="7" height="5" rx="2" /><rect x="14.5" y="16" width="7" height="5" rx="2" /><path d="M12 8v4M6 16v-2h12v2" /></>;
    case 'flashcards':
      return <><rect x="5" y="6" width="14" height="14" rx="3" /><path d="M8 6V4h12a1 1 0 0 1 1 1v12h-2M9 11h6M9 15h4" /></>;
  }
}

export function EducationalIcon({ name, className, ...props }: IconProps) {
  const showFallback = (event: SyntheticEvent<HTMLImageElement>) => {
    event.currentTarget.hidden = true;
    const fallback = event.currentTarget.nextElementSibling;
    if (fallback instanceof SVGElement) fallback.removeAttribute('style');
  };

  return (
    <span
      className={cn('relative inline-grid shrink-0 place-items-center', className)}
      aria-hidden="true"
      data-educational-icon={name}
      data-icon-asset={EDUCATIONAL_ICON_ASSET[name]}
      {...props}
    >
      <img
        src={'/branding/semantic-icons/' + EDUCATIONAL_ICON_ASSET[name] + '.webp'}
        alt=""
        draggable={false}
        className="h-full w-full select-none object-contain drop-shadow-sm"
        onError={showFallback}
      />
      <svg
        style={{ display: 'none' }}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-full w-full"
        data-educational-icon-fallback={name}
      >
        <Glyph name={name} />
      </svg>
    </span>
  );
}
