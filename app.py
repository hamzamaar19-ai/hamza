from datetime import date
from flask import Flask, redirect, render_template, request, url_for, flash
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///rental_agency.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SECRET_KEY"] = "change-me"

db = SQLAlchemy(app)


class Vehicle(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    plate_number = db.Column(db.String(20), nullable=False)
    status = db.Column(db.String(40), default="Disponible")
    daily_rate = db.Column(db.Float, default=0.0)

    reservations = db.relationship("Reservation", backref="vehicle", lazy=True)


class Client(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(50), nullable=True)

    reservations = db.relationship("Reservation", backref="client", lazy=True)


class Reservation(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    vehicle_id = db.Column(db.Integer, db.ForeignKey("vehicle.id"), nullable=False)
    client_id = db.Column(db.Integer, db.ForeignKey("client.id"), nullable=False)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(40), default="Confirmée")


class Task(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(120), nullable=False)
    description = db.Column(db.Text, nullable=True)
    due_date = db.Column(db.Date, nullable=True)
    completed = db.Column(db.Boolean, default=False)


@app.before_first_request
def create_tables():
    db.create_all()


@app.route("/")
def index():
    vehicle_count = Vehicle.query.count()
    client_count = Client.query.count()
    reservation_count = Reservation.query.count()
    open_tasks = Task.query.filter_by(completed=False).count()
    upcoming_reservations = Reservation.query.order_by(Reservation.start_date).limit(5).all()
    pending_tasks = Task.query.filter_by(completed=False).order_by(Task.due_date).limit(5).all()
    return render_template(
        "index.html",
        vehicle_count=vehicle_count,
        client_count=client_count,
        reservation_count=reservation_count,
        open_tasks=open_tasks,
        upcoming_reservations=upcoming_reservations,
        pending_tasks=pending_tasks,
    )


@app.route("/vehicles", methods=["GET", "POST"])
def vehicles():
    if request.method == "POST":
        name = request.form.get("name")
        plate_number = request.form.get("plate_number")
        status = request.form.get("status", "Disponible")
        daily_rate = float(request.form.get("daily_rate", 0))
        vehicle = Vehicle(name=name, plate_number=plate_number, status=status, daily_rate=daily_rate)
        db.session.add(vehicle)
        db.session.commit()
        flash("Véhicule ajouté avec succès", "success")
        return redirect(url_for("vehicles"))
    vehicles = Vehicle.query.order_by(Vehicle.name).all()
    return render_template("vehicles.html", vehicles=vehicles)


@app.route("/clients", methods=["GET", "POST"])
def clients():
    if request.method == "POST":
        name = request.form.get("name")
        email = request.form.get("email")
        phone = request.form.get("phone")
        client = Client(name=name, email=email, phone=phone)
        db.session.add(client)
        db.session.commit()
        flash("Client ajouté", "success")
        return redirect(url_for("clients"))
    clients = Client.query.order_by(Client.name).all()
    return render_template("clients.html", clients=clients)


@app.route("/reservations", methods=["GET", "POST"])
def reservations():
    vehicles = Vehicle.query.order_by(Vehicle.name).all()
    clients = Client.query.order_by(Client.name).all()
    if request.method == "POST":
        vehicle_id = int(request.form.get("vehicle_id"))
        client_id = int(request.form.get("client_id"))
        start_date = date.fromisoformat(request.form.get("start_date"))
        end_date = date.fromisoformat(request.form.get("end_date"))
        status = request.form.get("status", "Confirmée")
        reservation = Reservation(
            vehicle_id=vehicle_id,
            client_id=client_id,
            start_date=start_date,
            end_date=end_date,
            status=status,
        )
        db.session.add(reservation)
        db.session.commit()
        flash("Réservation enregistrée", "success")
        return redirect(url_for("reservations"))
    reservations_list = Reservation.query.order_by(Reservation.start_date.desc()).all()
    return render_template(
        "reservations.html",
        reservations=reservations_list,
        vehicles=vehicles,
        clients=clients,
    )


@app.route("/tasks", methods=["GET", "POST"])
def tasks():
    if request.method == "POST":
        title = request.form.get("title")
        description = request.form.get("description")
        due_date_value = request.form.get("due_date")
        due_date = date.fromisoformat(due_date_value) if due_date_value else None
        task = Task(title=title, description=description, due_date=due_date)
        db.session.add(task)
        db.session.commit()
        flash("Tâche créée", "success")
        return redirect(url_for("tasks"))
    tasks_list = Task.query.order_by(Task.completed, Task.due_date).all()
    return render_template("tasks.html", tasks=tasks_list)


@app.route("/tasks/<int:task_id>/toggle", methods=["POST"])
def toggle_task(task_id: int):
    task = Task.query.get_or_404(task_id)
    task.completed = not task.completed
    db.session.commit()
    flash("Statut de tâche mis à jour", "success")
    return redirect(url_for("tasks"))


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
