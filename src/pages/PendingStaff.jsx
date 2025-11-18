import { useEffect, useState } from "react";
import { axiosClient } from "../api/axiosClient";

export default function PendingStaff() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPending = async () => {
    try {
      const res = await axiosClient.get("/api/staffs/pending");
      setStaff(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const approveStaff = async (id) => {
    try {
      await axiosClient.put(`/api/staffs/approve/${id}`);
      setStaff(staff.filter((s) => s._id !== id));
      alert("Staff approved successfully!");
    } catch (err) {
      console.error(err);
      alert("Failed to approve staff.");
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  if (loading) return <p>Loading pending staff...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-900 via-indigo-800 to-purple-900 bg-clip-text text-transparent mb-4">
        Pending Staff Approvals
      </h1>
      {staff.length === 0 ? (
        <p className="text-gray-600">No pending staff at the moment.</p>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-hidden border border-purple-100">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-purple-50 to-indigo-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-purple-900">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-purple-900">
                  Email
                </th>
                <th className="px-6 py-3 text-sm font-medium text-purple-900">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr
                  key={s._id}
                  className="border-t border-purple-100 hover:bg-purple-50/50 transition-colors"
                >
                  <td className="px-6 py-3">{s.name}</td>
                  <td className="px-6 py-3">{s.email}</td>
                  <td className="px-6 py-3 text-center">
                    <button
                      onClick={() => approveStaff(s._id)}
                      className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-4 py-1.5 rounded-md transition-all duration-300 shadow-md hover:shadow-lg"
                    >
                      Approve
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
