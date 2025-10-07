import React from 'react';

export default function ConnectionItem({ person }) {
  const placeholder = chrome.runtime.getURL('icons/icon48.png');
  return (
    <div className="flex items-center p-2 space-x-3 border rounded">
      <img src={person.profilePicture || placeholder} alt="avatar" className="object-cover w-12 h-12 rounded-full" />
      <div className="flex-1">
        <div className="font-medium">{person.fullName || 'No name'}</div>
        <div className="text-sm text-gray-600">{person.position || '—'}</div>
      </div>
      <div className="text-sm text-gray-700">{person.companyName || '—'}</div>
    </div>
  );
}
