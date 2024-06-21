import { generateId as nanoid } from "ai";
import { library } from "autofunction";
import { z } from "zod";
import {
  Table,
  TableCaption,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "../components/ui/table";
import { jsx } from "./schemas";

export const utils = library({
  name: "utils",
  items: {
    generateId: () => nanoid(8),
  },
  documentation: {
    generateId: z.function().args().returns(z.string()),
  },
});

// doesn't work with JSX yet... todo

// const props = z.object({
//   children: jsx.optional().describe("children"),
//   className: z.string().optional().describe("tailwind class names for styling"),
// }).describe("react component props");

// function component(extras?: Record<string, z.ZodType<any>>) {
//   return z.function()
//     .args(extras ? props.extend(extras) : props)
//     .returns(jsx)
// }

// export const components = library({
//   name: "Components",
//   items: { Table, TableCaption, TableHeader, TableRow, TableHead, TableBody, TableCell },
//   documentation: {
//     TableHeader: component(),
//     TableCaption: component(),
//     TableRow: component(),
//     TableHead: component(),
//     TableBody: component(),
//     TableCell: component(),
//     Table: component().describe(`
//       A pre-built table component with nice default Tailwind styling.
//       You can overwrite some of the Tailwind classes by passing in a className prop.
//       Overall a Table might look like this:
//       <Table>
//         <TableCaption>A list of your recent invoices.</TableCaption>
//         <TableHeader>
//           <TableRow>
//             <TableHead className="w-[100px]">Invoice</TableHead>
//             <TableHead>Status</TableHead>
//             <TableHead>Method</TableHead>
//             <TableHead className="text-right">Amount</TableHead>
//           </TableRow>
//         </TableHeader>
//         <TableBody>
//           {invoices.map((invoice) => (
//             <TableRow key={invoice.invoice}>
//               <TableCell className="font-medium">{invoice.invoice}</TableCell>
//               <TableCell>{invoice.paymentStatus}</TableCell>
//               <TableCell>{invoice.paymentMethod}</TableCell>
//               <TableCell className="text-right">{invoice.totalAmount}</TableCell>
//             </TableRow>
//           ))}
//         </TableBody>
//         <TableFooter>
//           <TableRow>
//             <TableCell colSpan={3}>Total</TableCell>
//             <TableCell className="text-right">$2,500.00</TableCell>
//           </TableRow>
//         </TableFooter>
//       </Table>
//       `
//     ),
//   }
// })
