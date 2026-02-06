/**
 * Edit Customer Note Route
 * 
 * Simple form to update the customer's note.
 * Does not allow editing the name (to maintain uniqueness).
 */

import type { ActionFunctionArgs, LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { redirect, json, useLoaderData, useActionData, Form, Link } from "@remix-run/react";
import { ObjectId } from "mongodb";
import { getCustomerById, updateCustomerNote, type Customer } from "~/models/customer.server";

export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: `Sửa ${data?.customer.displayName || "Thành viên"} - Kana Box V2` },
];

interface LoaderData {
  customer: Customer;
}

interface ActionData {
  error?: string;
}

export async function loader({ params }: LoaderFunctionArgs) {
  const { customerId } = params;

  if (!customerId || !ObjectId.isValid(customerId)) {
    throw new Response("ID thành viên không hợp lệ", { status: 400 });
  }

  const customer = await getCustomerById(customerId);
  if (!customer) {
    throw new Response("Không tìm thấy thành viên", { status: 404 });
  }

  return json<LoaderData>({ customer });
}

export async function action({ request, params }: ActionFunctionArgs) {
  const { customerId } = params;

  if (!customerId || !ObjectId.isValid(customerId)) {
    throw new Response("ID thành viên không hợp lệ", { status: 400 });
  }

  const formData = await request.formData();
  const note = String(formData.get("note") || "").trim() || undefined;

  const result = await updateCustomerNote(customerId, note);
  
  if (!result) {
    return json<ActionData>(
      { error: "Cập nhật thành viên thất bại" },
      { status: 500 }
    );
  }

  return redirect(`/customers/${customerId}`);
}

export default function EditCustomer() {
  const { customer } = useLoaderData<typeof loader>();
  const actionData = useActionData<typeof action>();

  return (
    <div className="max-w-2xl">
      {/* Breadcrumb */}
      <div className="mb-6">
        <Link
          to={`/customers/${customer._id.toString()}`}
          className="text-sm text-blue-600 hover:text-blue-900"
        >
          ← Quay lại {customer.displayName}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          Sửa ghi chú thành viên
        </h1>
      </div>

      {/* Form */}
      <div className="card">
        <Form method="post" className="space-y-6 card-body">
          {actionData?.error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-700">{actionData.error}</p>
            </div>
          )}

          {/* Name (Read-only) */}
          <div>
            <label className="form-label">Tên</label>
            <input
              type="text"
              value={customer.displayName}
              disabled
              className="form-input mt-1 bg-gray-100"
            />
            <p className="mt-1 text-xs text-gray-500">
              Không thể đổi tên để đảm bảo tính duy nhất.
            </p>
          </div>

          {/* Note Field */}
          <div>
            <label htmlFor="note" className="form-label">
              Ghi chú
            </label>
            <textarea
              name="note"
              id="note"
              rows={4}
              defaultValue={customer.note || ""}
              className="form-input mt-1"
              placeholder="Ghi chú (tùy chọn) về thành viên..."
            />
          </div>

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-4">
            <Link
              to={`/customers/${customer._id.toString()}`}
              className="btn-secondary"
            >
              Hủy
            </Link>
            <button type="submit" className="btn-primary">
              Lưu thay đổi
            </button>
          </div>
        </Form>
      </div>
    </div>
  );
}
