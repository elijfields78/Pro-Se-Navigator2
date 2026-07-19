import { Platform, Share } from 'react-native';
import { CaseArtifact } from '@/contexts/types';

/**
 * Get a drafted document out of the app and into the user's hands.
 * Web: a real file download (.md). Native: the system share sheet — save to
 * Files, AirDrop, email, print. (.docx generation is a server-side upgrade;
 * the text content is the artifact of record today.)
 */
export async function downloadArtifact(artifact: CaseArtifact): Promise<void> {
  const filename = `${artifact.title.replace(/[^\w\- ]+/g, '').trim() || 'document'}.md`;
  const body = `# ${artifact.title}\n\n${artifact.content}`;

  if (Platform.OS === 'web') {
    const blob = new Blob([body], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    return;
  }

  await Share.share(
    Platform.OS === 'ios'
      ? { message: body, title: artifact.title }
      : { message: body, title: artifact.title },
  );
}
