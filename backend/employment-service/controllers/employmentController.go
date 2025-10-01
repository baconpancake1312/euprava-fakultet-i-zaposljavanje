package controllers

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"sort"
	"strconv"
	"time"

	"employment-service/data"
	"employment-service/models"

	"github.com/gin-gonic/gin"
	"github.com/go-playground/validator/v10"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type DormController struct {
	logger *log.Logger
	repo   *data.DormRepo
}

var validate = validator.New()

func NewEmploymentController(l *log.Logger, r *data.DormRepo) *DormController {
	return &DormController{l, r}
}
func (dc DormController) GetStudentByID(studentId string) (*models.Student, error) {

	uniUrl := fmt.Sprintf("http://auth-service:8080/users/%v", studentId)
	uniResponse, err := http.Get(uniUrl)
	if err != nil {
		dc.logger.Printf("Error making GET request for user: %v", err)
		return nil, fmt.Errorf("error making GET request for user: %v", err)
	}
	defer uniResponse.Body.Close()

	if uniResponse.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(uniResponse.Body)
		dc.logger.Println("error: ", string(body))
		return nil, fmt.Errorf("uni service returned error: %s", string(body))
	}
	var returnedStudent *models.Student
	if err := json.NewDecoder(uniResponse.Body).Decode(&returnedStudent); err != nil {
		dc.logger.Printf("error parsing auth response body: %v\n", err)
		return nil, fmt.Errorf("error parsing uni response body")
	}
	return returnedStudent, nil

}
func validateSelectionPeriod(date1, date2 string) error {

	startDate, err := time.Parse("02-01-2006", date1)
	if err != nil {
		return fmt.Errorf("error parsing start date: %s", err.Error())
	}
	endDate, err := time.Parse("02-01-2006", date2)
	if err != nil {
		return fmt.Errorf("error parsing end date: %s", err.Error())
	}

	if startDate.Before(time.Now()) || endDate.Before(time.Now()) {
		return fmt.Errorf("you cannot make a selection period in the past")
	}
	if !startDate.Before(endDate) {
		return fmt.Errorf("end date date must be after start date")
	}

	duration := endDate.Sub(startDate)
	dayDifference := int(duration.Hours() / 24)
	if dayDifference < 14 {
		return fmt.Errorf("the selection period must be at least two weeks")
	}

	return nil
}

func (dc *DormController) GetSelection() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.Param("id")

		selectionId := id
		if selectionId == "" {
			c.JSON(http.StatusNotFound, gin.H{"error:": "selection id not found in token"})
			return
		}
		app, err := dc.repo.GetSelection(selectionId)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"database exception": err.Error()})
			return
		}
		c.JSON(http.StatusOK, app)

	}
}

func (dc *DormController) InsertSelection() gin.HandlerFunc {
	return func(c *gin.Context) {

		var selection models.Selection
		buildingid := c.Param("buildingId")

		buildingObjectId, err := primitive.ObjectIDFromHex(buildingid)
		selection.BuildingId = buildingObjectId

		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid building ID"})
			return
		}
		if err := c.BindJSON(&selection); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"parsing failed": selection})
			dc.logger.Printf("json error")
			return
		}

		err = validateSelectionPeriod(selection.StartDate, selection.EndDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error:": err.Error()})
			return
		}

		overlapErr := dc.repo.CheckSelectionOverlap(selection, false)
		if overlapErr != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error:": overlapErr.Error()})
			return
		}

		assignedId, err := dc.repo.InsertSelection(&selection)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		selection.Id = assignedId
		c.JSON(http.StatusOK, gin.H{"Dorm selection period created": selection})

	}
}

func (dc *DormController) UpdateSelection() gin.HandlerFunc {
	return func(c *gin.Context) {

		selectionID := c.Param("id")

		var selection models.Selection
		objectId, err := primitive.ObjectIDFromHex(selectionID)
		selection.Id = objectId

		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to convert id from url to type ObjectID"})
			return
		}

		if err := c.ShouldBindJSON(&selection); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}

		err = validateSelectionPeriod(selection.StartDate, selection.EndDate)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error:": err.Error()})
			return
		}

		overlapErr := dc.repo.CheckSelectionOverlap(selection, true)
		if overlapErr != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error:": overlapErr.Error()})
			return
		}

		err = dc.repo.UpdateSelection(selectionID, &selection)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Selection updated successfully"})
	}
}

func (dc *DormController) DeleteSelection() gin.HandlerFunc {
	return func(c *gin.Context) {
		selectionID := c.Param("id")

		err := dc.repo.DeleteSelection(selectionID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Selection deleted successfully"})
	}
}
func (dc *DormController) InsertApplication() gin.HandlerFunc {
	return func(c *gin.Context) {

		selectionId, exists := c.Params.Get("selectionId")
		id, exists1 := c.Get("uid")
		studentId := id.(string)
		if !exists || !exists1 {
			c.JSON(http.StatusBadRequest, gin.H{"error: student/selection id not found. Student ": studentId})
			return
		}
		var application models.Application

		student, err := dc.GetStudentByID(studentId)
		if student == nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Student not found"})
			return
		}
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		application.Student = student
		app, err := dc.repo.InsertApp(application, selectionId)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"database exception": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"Application created": app})
	}
}

func (dc *DormController) GetAllApplications() gin.HandlerFunc {
	return func(c *gin.Context) {

		apps, err := dc.repo.GetAllApplications()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"database exception": err.Error()})
			return
		}
		c.JSON(http.StatusOK, apps)
	}
}
func (dc *DormController) GetApplication() gin.HandlerFunc {
	return func(c *gin.Context) {
		id, exists := c.Get("uid")
		sid, exists1 := c.Get("sid")
		studentId := id.(string)
		selectionId := sid.(string)

		if !exists || !exists1 {
			c.JSON(http.StatusNotFound, gin.H{"error: student/selection id not found in token": studentId})
			return
		}

		app, err := dc.repo.GetApplication(studentId, selectionId)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"database exception": err.Error()})
			return
		}
		c.JSON(http.StatusOK, app)

	}
}

func (dc *DormController) DeleteApplication() gin.HandlerFunc {
	return func(c *gin.Context) {

		selectionId := c.Param("id")
		studentId, exists := c.Get("uid")
		if !exists {
			c.JSON(http.StatusNotFound, gin.H{"error: student/selection id not found in token": studentId})
			return
		}
		err := dc.repo.DeleteApp(studentId.(string), selectionId)
		if err != nil {
			c.JSON(http.StatusInternalServerError, err.Error())
			return
		}

		c.JSON(http.StatusOK, "Application deleted successfully.")

	}
}

// func (dc DormController) ProcessApplications(selection Selection) error {
// select all pending applications, rank them,
// accept the first n number of them based on how many spaces there are
// assign students to random non-full rooms
// }

func (dc *DormController) RankStudents(selection models.Selection) ([]models.Student, error) {
	var studentsRanked []models.Student
	for _, app := range selection.Applications {
		studentsRanked = append(studentsRanked, *app.Student)
	}
	sort.Slice(studentsRanked, func(i, j int) bool {
		if studentsRanked[i].GPA == studentsRanked[j].GPA {
			return studentsRanked[i].Year > studentsRanked[j].Year
		}
		return studentsRanked[i].GPA > studentsRanked[j].GPA
	})
	return studentsRanked, nil

}

// func (dc *DormController) AssignStudents(students []models.Students, buildingId string) error {

// 	buildingObjectId, err := primitive.ObjectIDFromHex(buildingId)
// 	building, err := dc.GetBuildingLocal(buildingObjectId.Hex())
// 	if err != nil {
// 		return fmt.Errorf(err.Error())
// 	}
// 	numOfStudents := len(students)
// 	var count int
// 	for i, room := range building.Rooms {
// 		count = count + 1
// 		for _ ,student := range students{
// 		room.Students = &models.Students{}
// 		*room.Students = append(*room.Students, student)
// 		}
// 	}
// 	return nil

// }

func (dc *DormController) AssignStudents(rankedStudents []models.Student, buildingId string) error {
	// Convert buildingId to ObjectID
	buildingObjectId, err := primitive.ObjectIDFromHex(buildingId)
	if err != nil {
		return fmt.Errorf("invalid building ID: %v", err)
	}
	building, err := dc.GetBuildingLocal(buildingObjectId.Hex())
	if err != nil {
		return fmt.Errorf(err.Error())
	}

	// Iterate through ranked students and assign them to rooms
	studentIndex := 0
	for _, room := range building.Rooms {
		// Check room capacity and fill it
		for room.Students == nil || len(*room.Students) < room.Capacity {
			if studentIndex >= len(rankedStudents) {
				break // No more students to assign
			}

			// Add student to room
			if room.Students == nil {
				room.Students = &models.Students{}
			}

			student := &rankedStudents[studentIndex]
			*room.Students = append(*room.Students, student)

			// Increment student index
			studentIndex++

			// If room is full, break and move to the next room
			if len(*room.Students) >= room.Capacity {
				break
			}
		}

		err := dc.EditRoomLocal(room.Room_Number, buildingId, *room)
		if err != nil {
			return fmt.Errorf("failed to update room %d: %v", room.Room_Number, err)
		}

		// Break if all students have been assigned
		if studentIndex >= len(rankedStudents) {
			break
		}
	}

	//If not all students could be assigned, handle that case
	if studentIndex < len(rankedStudents) {
		return fmt.Errorf("not all students could be assigned to rooms, remaining: %d", len(rankedStudents)-studentIndex)
	}

	return nil
}

func (dc *DormController) InsertBuilding() gin.HandlerFunc {
	return func(c *gin.Context) {

		var building models.Building
		if err := c.BindJSON(&building); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "parsing failed"})
			return
		}
		validationErr := validate.Struct(building)
		if validationErr != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": validationErr.Error()})
			return
		}
		buildingId, err := dc.repo.InsertBuilding(building)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"database error": err.Error()})
			return
		}
		building.Id = buildingId
		c.JSON(http.StatusOK, gin.H{"Building created": building})

	}
}

func (dc *DormController) GetBuilding() gin.HandlerFunc {
	return func(c *gin.Context) {
		buildingId := c.Param("id")
		building, err := dc.repo.GetBuilding(buildingId)
		if err != nil {
			c.JSON(http.StatusNotFound, err.Error())
			return
		}

		c.JSON(http.StatusOK, building)

	}
}

func (dc *DormController) GetBuildingLocal(buildingId string) (models.Building, error) {

	building, err := dc.repo.GetBuilding(buildingId)
	if err != nil {
		return *building, err
	}
	return *building, nil

}
func (dc *DormController) DeleteBuilding() gin.HandlerFunc {
	return func(c *gin.Context) {

		buildingId := c.Param("id")
		building, err := dc.repo.GetBuilding(buildingId)
		if err != nil {
			c.JSON(http.StatusNotFound, err.Error())
		}

		c.JSON(http.StatusOK, building)

	}
}

func (dc *DormController) InsertRoom() gin.HandlerFunc {
	return func(c *gin.Context) {
		type RoomInfo struct {
			Capacity int `json:"capacity"`
		}
		buildingIdParam := c.Param("id")
		var room RoomInfo

		if err := c.BindJSON(&room); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "parsing failed", "details": err.Error()})
			return
		}

		err := dc.repo.InsertRoom(room.Capacity, buildingIdParam)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, gin.H{"Room created": room})
	}
}

func (dc *DormController) EditRoomLocal(roomNumber int, buildingIdString string, updatedRoom models.Room) error {

	buildingId, err := primitive.ObjectIDFromHex(buildingIdString)
	if err != nil {
		return err
	}

	if err := dc.repo.EditRoom(roomNumber, buildingId, &updatedRoom); err != nil {
		return err
	}

	return nil
}

func (dc *DormController) GetRoom() gin.HandlerFunc {
	return func(c *gin.Context) {
		roomNumberParam := c.Param("number")
		buildingIdParam := c.Param("id")
		roomNumber, err := strconv.Atoi(roomNumberParam)
		if err != nil {
			fmt.Println("Error:", err)
			return
		}
		room, err := dc.repo.GetRoom(roomNumber, buildingIdParam)
		if err != nil {
			c.JSON(http.StatusNotFound, err.Error())
		}

		c.JSON(http.StatusOK, room)

	}
}

// JobListing CRUD operations

func (dc *DormController) CreateJobListing() gin.HandlerFunc {
	return func(c *gin.Context) {
		var listing models.JobListing

		if err := c.BindJSON(&listing); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}

		listingId, err := dc.repo.InsertJobListing(&listing)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		listing.Id = listingId
		c.JSON(http.StatusOK, gin.H{"message": "Job listing created successfully", "listing": listing})
	}
}

func (dc *DormController) GetJobListing() gin.HandlerFunc {
	return func(c *gin.Context) {
		listingId := c.Param("id")

		listing, err := dc.repo.GetJobListing(listingId)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, listing)
	}
}

func (dc *DormController) GetAllJobListings() gin.HandlerFunc {
	return func(c *gin.Context) {
		listings, err := dc.repo.GetAllJobListings()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, listings)
	}
}

func (dc *DormController) UpdateJobListing() gin.HandlerFunc {
	return func(c *gin.Context) {
		listingId := c.Param("id")

		var listing models.JobListing
		if err := c.BindJSON(&listing); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
			return
		}

		err := dc.repo.UpdateJobListing(listingId, &listing)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Job listing updated successfully"})
	}
}

func (dc *DormController) DeleteJobListing() gin.HandlerFunc {
	return func(c *gin.Context) {
		listingId := c.Param("id")

		err := dc.repo.DeleteJobListing(listingId)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "Job listing deleted successfully"})
	}
}