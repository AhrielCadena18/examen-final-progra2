import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { DatabaseService } from '../../services/database.service';
//import ngModel
import { NgModule } from '@angular/core';
import { TicketBought } from '../objects/ticket_bought';

import { FormsModule } from '@angular/forms';


@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './cart.component.html',
  styleUrls: ['./cart.component.scss']
})
export class CartComponent implements OnInit {

  cartOpen: boolean = false;
  cartItems: any[] = []; // Los elementos del carrito del usuario actual

  constructor(
    private auth: AuthService,
    private db: DatabaseService,
    
  ) {}
  

  ngOnInit(): void {
    // Verifica si el usuario tiene un carrito y suscríbete a los cambios
    if (this.auth.profile) {
      this.cartItems = this.auth.profile.cart || [];
      this.subscribeToCart();
    } else {
      console.error('El usuario no está autenticado.');
    }
  }

  toggleCart(): void {
    this.cartOpen = !this.cartOpen;
  }

  checkout(): void {
    if (this.cartItems.length > 0) {
      // Confirmar antes de comprar
      if (confirm('¿Estás seguro de que deseas comprar estos productos?')) {
        // Crear un nuevo pedido
        const listOfTickets: TicketBought[] = [];
  
        // Crear un nuevo ticket por cada producto en el carrito
        this.cartItems.forEach(item => {
          const newTicket = new TicketBought(
            "", 
            new Date().toISOString(), 
            item, 
            this.auth.profile, 
            item.quantity, 
            item.price,
            
          );
          listOfTickets.push(newTicket);
        });
  
        console.log('Tickets comprados:', listOfTickets);
  
        // Subir los tickets a Firestore
        listOfTickets.forEach(ticket => {
          // Convertir el ticket a un objeto plano
          const plainTicket = { ...ticket }; 
  
          this.db.addFirestoreDocument('tickets_bought', plainTicket)
            .then(() => {
              console.log('Ticket subido correctamente.');
            })
            .catch(error => {
              console.error('Error al subir ticket:', error.message);
            });
        });


        //BORRAR DEL CARRITO CON EL METODO removeFromCart 
        this.cartItems.forEach(item => {
          this.removeFromCart(item);
        });
      }
    }
  }
  
  decreaseQuantity(item: any) {
    if (item.quantity > 1) {
      //update quantity in firestore
      item.quantity--;

      item.price = item.price * item.quantity;

        
    }
  }
  
  increaseQuantity(item: any) {
    item.quantity++;
    item.price = item.price * item.quantity
  }

  removeFromCart(data: any) {
    this.db.fetchFirestoreCollection('users')
    .subscribe((res: any) => {
      res.forEach((user: any) => {
        let cartToUpdate = [...(user.cart || [])];
        if (cartToUpdate.find((item: any) => item.id === data.id)) {
          cartToUpdate = cartToUpdate.filter((item: any) => item.id !== data.id);
          let userUpdate = {...user};
          userUpdate.cart = cartToUpdate;
          this.db.updateFirestoreDocument('users', userUpdate.id, userUpdate)
            .then(() => {
              console.log('Datos actualizados correctamente.');
            })
            .catch(error => {
              console.error('Error al actualizar datos:', error.message);
            });
          }
        });
      });
    }
  
  updateQuantity(item: any) {
    if (item.quantity < 1) {
      item.quantity = 1; // Asegura que la cantidad no sea menor que 1
    }
  }
  

  private subscribeToCart(): void {
    const userId = this.auth.profile.id;

    this.db.getDocumentById('users', userId).subscribe((userData: any) => {
      if (userData && userData.cart) {
        this.cartItems = userData.cart;
        //if quantity is not defined, set it to 1
        this.cartItems.forEach(item => {
          if (!item.quantity) {
            item.quantity = 1;
          }
        });
        console.log('Carrito actualizado:', this.cartItems);
      }
    });
  }
}
