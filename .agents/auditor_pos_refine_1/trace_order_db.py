import sys
import os
import asyncio
import uuid

if sys.platform == "win32":
    import asyncio
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

sys.path.append(r"e:\posa\backend")

from app.core.database import AsyncSessionLocal
from app.models.ban_hang import Order, OrderItem
from sqlalchemy import select

async def run():
    print("Starting DB Order insertion test...")
    async with AsyncSessionLocal() as session:
        try:
            # 1. Fetch a table and a product
            from app.models.ban_hang import Table, Product
            t_res = await session.execute(select(Table).limit(1))
            table = t_res.scalar()
            p_res = await session.execute(select(Product).limit(1))
            product = p_res.scalar()
            
            print(f"Using table ID: {table.id}")
            print(f"Using product ID: {product.id}")

            # 2. Replicate orders.py create_order logic
            cashier_id = uuid.UUID("00000000-0000-0000-0000-000000000001")
            
            total = product.price * 2
            
            order = Order(
                table_id=table.id,
                cashier_id=cashier_id,
                total_amount=total,
                note="Test note",
            )
            session.add(order)
            await session.flush()
            print(f"Flushed Order: {order.id}")

            oi = OrderItem(
                order_id=order.id,
                product_id=product.id,
                product_name=product.name,
                quantity=2,
                unit_price=product.price,
                options={"size": "Regular", "toppings": []},
                note="Test note"
            )
            session.add(oi)
            await session.flush()
            print(f"Flushed OrderItem: {oi.id}")
            
            await session.commit()
            print("Committed successfully!")

        except Exception as e:
            print("Error occurred:")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(run())
