import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

export default function Search() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let timer;
    if (query.trim().length >= 3) {
      setLoading(true);
      timer = setTimeout(async () => {
        try {
          const res = await axios.get(`/api/v1/users/search?q=${query}`);
          setResults(res.data);
        } catch (error) {
          console.error("Search failed:", error);
          setResults([]);
        } finally {
          setLoading(false);
        }
      }, 500);
    } else {
      setResults([]);
      setShowAll(false);
    }

    return () => clearTimeout(timer);
  }, [query]);

  const displayedResults = showAll ? results : results.slice(0, 3);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-gray-900">Search People</h1>
      <p className="mt-2 text-gray-600">Find people and connect with them.</p>
      
      <div className="mt-4 max-w-md">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by username..."
          className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="mt-6 max-w-md">
        {loading && <p className="text-gray-500">Searching...</p>}
        {!loading && query.length >= 3 && results.length === 0 && (
          <p className="text-gray-500">No users found.</p>
        )}
        
        {!loading && results.length > 0 && (
          <ul className="space-y-4">
            {displayedResults.map((user) => (
              <li key={user.id} className="block">
                <Link to={`/profile/${user.username}`} className="flex items-center gap-4 p-3 border border-gray-100 rounded-lg shadow-sm hover:bg-gray-50 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold overflow-hidden">
                    {user.profilePicture ? (
                      <img src={user.profilePicture} alt={user.username} className="w-full h-full object-cover" />
                    ) : (
                      user.username.charAt(0).toUpperCase()
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{user.username}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {!loading && results.length > 3 && (
          <button
            onClick={() => setShowAll(!showAll)}
            className="mt-4 text-blue-500 hover:text-blue-700 font-medium"
          >
            {showAll ? "Show less" : `Show more (${results.length - 3} remaining)`}
          </button>
        )}
      </div>
    </div>
  );
}
