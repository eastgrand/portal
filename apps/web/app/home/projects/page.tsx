'use client';

import { useState, useEffect } from 'react';

export default function ProjectsPage() {
  const [time, setTime] = useState('Loading...');

  useEffect(() => {
    console.log('ProjectsPage mounted');
    setTime(new Date().toISOString());
  }, []);

  console.log('ProjectsPage rendering');
  
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold">Projects Page</h1>
      <p className="mt-2">This is a test to see if the page renders at all.</p>
      <div className="mt-4 p-4 bg-gray-100 rounded">
        <p>Debug Info:</p>
        <p>Time: {time}</p>
      </div>
    </div>
  );
}