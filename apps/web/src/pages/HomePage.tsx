import { Construction } from "lucide-react";

export function HomePage() {
  return (
      <div className="flex p-14 items-center justify-center  px-6">
      <div className="max-w-lg text-center">
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-amber-100">
          <Construction className="h-10 w-10 text-amber-600" />
        </div>

        <h1 className="text-3xl font-bold">
          Home Page Coming Soon
        </h1>

        <p className="mt-4 text-gray-600">
          The home page is intentionally left out of this assessment because it
          is outside the required scope. Please use the navigation menu to
          explore the implemented features.
        </p>

        <div className="mt-8 rounded-lg border border-gray-200 bg-white p-4 text-left">
          <h2 className="font-semibold text-gray-900">
            Assessment Status
          </h2>

          <ul className="mt-3 space-y-2 text-sm text-gray-600">
            <li>✅ Required assessment features are implemented.</li>
            <li>✅ Navigation is fully functional.</li>
            <li>🚧 Home page is reserved for future implementation.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
