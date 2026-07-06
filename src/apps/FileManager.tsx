import { FolderOpen } from 'lucide-react';

export default function FileManager() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
      <FolderOpen size={48} className="text-[#00E5A0] opacity-60" />
      <div>
        <h2 className="text-xl font-semibold text-[#E8E8F0]">File Manager</h2>
        <p className="text-sm text-[#8A8AA3] mt-1">File browser coming soon</p>
      </div>
    </div>
  );
}
