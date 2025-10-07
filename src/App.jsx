import React, { useEffect, useState } from 'react';
import ConnectionItem from './components/ConnectionItem';

// helper to promisify chrome.runtime.sendMessage
function sendBg(msg) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(msg, (resp) => resolve(resp));
  });
}

export default function App() {
  const [connections, setConnections] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState('All');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function loadConnections() {
    setLoading(true);
    setError(null);
    try {
      const resp = await sendBg({ type: 'GET_CONNECTIONS' });
      if (!resp || !resp.ok) throw new Error(resp?.error || 'Failed to fetch connections');
      const list = resp.data || [];
      setConnections(list);
      setFiltered(list);
      const companyNames = Array.from(new Set(list.map(c => c.companyName).filter(Boolean)));
      setCompanies(companyNames);

      // lazy fetch person details (do not await) — background queues & caches them
      list.forEach(p => {
        sendBg({ type: 'GET_PERSON', id: p.id }).then(r => {
          if (r && r.ok) {
            setConnections(prev => {
              const next = prev.map(item => item.id === r.data.id ? { ...item, ...r.data } : item);
              // update companies list if a new company appears
              const newCompany = r.data.companyName;
              if (newCompany && !companyNames.includes(newCompany)) {
                setCompanies(prevC => Array.from(new Set([...prevC, newCompany])));
              }
              setFiltered(applyFilter(next, selectedCompany));
              return next;
            });
          }
        }).catch(() => {});
      });
    } catch (e) {
      setError(e.message || 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  function applyFilter(list = connections, company = selectedCompany) {
    if (company === 'All') return list;
    return list.filter(c => c.companyName === company);
  }

  useEffect(() => {
    loadConnections();
  }, []);

  useEffect(() => {
    setFiltered(applyFilter(connections, selectedCompany));
  }, [selectedCompany, connections]);

  return (
    <div className="p-3 w-[420px]">
      <h2 className="mb-2 text-lg font-semibold">LinkedIn Connections</h2>
      {error && <div className="p-2 mb-2 text-red-800 bg-red-100 rounded">{error}</div>}
      <div className="flex items-center gap-2 mb-2">
        <select className="p-1 border rounded" value={selectedCompany} onChange={e => setSelectedCompany(e.target.value)}>
          <option value="All">All companies</option>
          {companies.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button className="px-3 py-1 text-white bg-blue-600 rounded" onClick={loadConnections} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      <div className="space-y-2 max-h-[60vh] overflow-auto">
        {filtered.map(c => <ConnectionItem key={c.id} person={c} />)}
        {filtered.length === 0 && !loading && <div className="text-sm text-gray-500">No connections found.</div>}
      </div>
    </div>
  );
}
