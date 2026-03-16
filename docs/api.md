# API REST (MVP)

Base path: `/api/v1`
Autenticação: `Authorization: Bearer <token>`

## Auth
- `POST /auth/login`
- `POST /auth/register-first-access`
- `POST /auth/refresh`
- `POST /auth/logout`

## Categorias
- `GET /categories`
- `POST /categories`
- `PUT /categories/:id`
- `DELETE /categories/:id`

## Fornecedores
- `GET /suppliers`
- `POST /suppliers`
- `PUT /suppliers/:id`
- `DELETE /suppliers/:id`

## Compras
- `GET /purchases?from=YYYY-MM-DD&to=YYYY-MM-DD&categoryId=&supplierId=`
- `GET /purchases/:id`
- `POST /purchases`
- `PUT /purchases/:id`
- `DELETE /purchases/:id`

Payload `POST /purchases`:

```json
{
  "purchaseDate": "2026-03-01",
  "supplierId": "uuid",
  "categoryId": "uuid",
  "totalAmount": 1250.50,
  "paymentMethod": "pix",
  "notes": "compra semanal",
  "items": [
    {
      "productName": "Contra filé",
      "quantity": 10,
      "unitPrice": 42.50,
      "categoryId": "uuid"
    }
  ]
}
```

## Dashboard
- `GET /dashboard/kpis?month=YYYY-MM`
- `GET /dashboard/evolution?months=12`
- `GET /dashboard/by-category?from=&to=`
- `GET /dashboard/by-supplier?from=&to=`

## Relatórios
- `GET /reports/category?from=&to=&compare=true`
- `GET /reports/supplier?from=&to=&compare=true`
- `GET /reports/period?groupBy=day|week|month&from=&to=`

## Alertas
- `GET /alerts?month=YYYY-MM&auto=true`
- `POST /alerts/recalculate?month=YYYY-MM&threshold=15`
- `POST /alerts/:id/read`

## Uploads
- `POST /uploads/invoice` (multipart/form-data, campo `file`)

## Exportação
- `GET /exports/purchases.csv?from=&to=`
- `GET /exports/reports.pdf?type=category&from=&to=`
