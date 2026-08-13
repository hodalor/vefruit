import React from 'react';

function BuyerDataTable({ columns = [], rows = [], emptyMessage = 'No records found.', onRowClick }) {
  return (
    <div className="AdminTableWrap">
      <table className="AdminTable BuyerTable">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td className="AdminEmptyCell" colSpan={Math.max(columns.length, 1)}>
                {emptyMessage}
              </td>
            </tr>
          ) : rows.map((row) => (
            <tr
              key={row.id}
              className={onRowClick ? 'AdminTableRowInteractive BuyerTableRow' : 'BuyerTableRow'}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              onKeyDown={onRowClick ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  onRowClick(row);
                }
              } : undefined}
              role={onRowClick ? 'button' : undefined}
              tabIndex={onRowClick ? 0 : undefined}
            >
              {columns.map((column) => (
                <td key={`${row.id}-${column.key}`} className={column.className || ''}>
                  {column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default BuyerDataTable;
